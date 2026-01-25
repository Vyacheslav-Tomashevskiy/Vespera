import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;
const RESET_TOKEN_EXPIRY_MINUTES = 60;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Register a new user with secure password hashing
   */
  async register(registerDto: RegisterDto) {
    const { email, password, firstName, lastName, role } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      this.logger.warn(`Registration attempt for existing email: ${email}`);
      throw new ConflictException('Email already registered');
    }

    // Hash password using bcrypt
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new user
    const user = this.userRepository.create({
      email: email.toLowerCase(),
      passwordHash: hashedPassword,
      firstName,
      lastName,
      role,
      status: 'pending',
      emailVerified: false,
      phoneVerified: false,
      kycStatus: 'not_started',
      failedLoginAttempts: 0,
      accountLocked: false,
    });

    const savedUser = await this.userRepository.save(user);
    this.logger.log(`User registered successfully: ${savedUser.id}`);

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(
      savedUser.id,
      savedUser.email,
      savedUser.role,
    );

    // Store refresh token
    savedUser.refreshToken = await bcrypt.hash(refreshToken, 12);
    await this.userRepository.save(savedUser);

    return {
      accessToken,
      refreshToken,
      user: {
        id: savedUser.id,
        email: savedUser.email,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        role: savedUser.role,
      },
    };
  }

  /**
   * Login user with email and password
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      this.logger.warn(`Login attempt for non-existent user: ${email}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if account is locked
    if (user.accountLocked && user.lockedUntil) {
      const now = new Date();
      if (user.lockedUntil > now) {
        const minutesRemaining = Math.ceil(
          (user.lockedUntil.getTime() - now.getTime()) / (1000 * 60),
        );
        this.logger.warn(`Login attempt for locked account: ${email}`);
        throw new UnauthorizedException(
          `Account is locked. Try again in ${minutesRemaining} minutes.`,
        );
      } else {
        // Unlock account if lockout period expired
        user.accountLocked = false;
        user.failedLoginAttempts = 0;
        user.lockedUntil = undefined;
      }
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      // Increment failed login attempts
      user.failedLoginAttempts += 1;

      // Lock account after max attempts
      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.accountLocked = true;
        user.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
        this.logger.warn(`Account locked due to failed attempts: ${email}`);
      }

      await this.userRepository.save(user);
      this.logger.warn(`Failed login attempt for user: ${email}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    // Reset failed attempts on successful login
    user.failedLoginAttempts = 0;
    user.accountLocked = false;
    user.lockedUntil = undefined;
    user.lastLoginAt = new Date();

    await this.userRepository.save(user);
    this.logger.log(`User logged in successfully: ${user.id}`);

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(
      user.id,
      user.email,
      user.role,
    );

    // Store refresh token
    user.refreshToken = await bcrypt.hash(refreshToken, 12);
    await this.userRepository.save(user);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;

    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'your-refresh-secret-key',
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Verify refresh token matches stored hash
      const isValidRefreshToken = await bcrypt.compare(refreshToken, user.refreshToken || '');

      if (!isValidRefreshToken) {
        this.logger.warn(`Invalid refresh token for user: ${user.id}`);
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens
      const { accessToken, refreshToken: newRefreshToken } = await this.generateTokens(
        user.id,
        user.email,
        user.role,
      );

      // Update refresh token
      user.refreshToken = await bcrypt.hash(newRefreshToken, 12);
      await this.userRepository.save(user);

      this.logger.log(`Token refreshed for user: ${user.id}`);

      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      this.logger.error(`Token refresh failed: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Request password reset
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    // Always return success message for security (don't reveal if email exists)
    if (!user) {
      this.logger.warn(`Password reset request for non-existent email: ${email}`);
      return {
        message: 'If an account exists with this email, you will receive a password reset link.',
      };
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.passwordResetToken = hashedToken;
    user.resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

    await this.userRepository.save(user);
    this.logger.log(`Password reset token generated for user: ${user.id}`);

    // TODO: Send email with reset link containing resetToken
    // The resetToken (not hashed) should be sent to the user's email
    console.log(`Reset token for ${email}: ${resetToken}`);

    return {
      message: 'If an account exists with this email, you will receive a password reset link.',
    };
  }

  /**
   * Reset password using reset token
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;

    // Hash the provided token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await this.userRepository.findOne({
      where: { passwordResetToken: hashedToken },
    });

    if (!user) {
      this.logger.warn('Password reset attempt with invalid token');
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Check if token has expired
    if (!user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
      this.logger.warn(`Expired password reset token for user: ${user.id}`);
      throw new BadRequestException('Reset token has expired');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    user.passwordHash = hashedPassword;
    user.passwordResetToken = undefined;
    user.resetTokenExpiresAt = undefined;
    user.failedLoginAttempts = 0;
    user.accountLocked = false;

    await this.userRepository.save(user);
    this.logger.log(`Password reset successful for user: ${user.id}`);

    return {
      message: 'Password has been reset successfully. Please log in with your new password.',
    };
  }

  /**
   * Logout user (invalidate refresh token)
   */
  async logout(userId: string) {
    await this.userRepository.update(
      { id: userId },
      { refreshToken: undefined },
    );

    this.logger.log(`User logged out: ${userId}`);

    return {
      message: 'Logged out successfully',
    };
  }

  /**
   * Generate JWT access and refresh tokens
   */
  private async generateTokens(userId: string, email: string, role: string) {
    const accessToken = this.jwtService.sign(
      {
        sub: userId,
        email,
        role,
        type: 'access',
      },
      {
        secret: this.configService.get<string>('JWT_SECRET') || 'your-secret-key',
        expiresIn: '15m',
      },
    );

    const refreshToken = this.jwtService.sign(
      {
        sub: userId,
        email,
        role,
        type: 'refresh',
      },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'your-refresh-secret-key',
        expiresIn: '7d',
      },
    );

    return { accessToken, refreshToken };
  }

  /**
   * Validate user by ID (used by JWT strategy)
   */
  async validateUserById(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }
}
