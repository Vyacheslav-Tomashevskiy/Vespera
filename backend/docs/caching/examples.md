# Caching Examples

## Example 1: Time-based Caching

```ts
@Cached({ ttl: 3_600_000 })
async getUser(id: string) {
  return this.userRepository.findOne({ where: { id } });
}
```

## Example 2: Event-based Invalidation

```ts
async updateUser(id: string, data: Record<string, unknown>) {
  const result = await this.userRepository.update(id, data);
  await this.cacheService.invalidate(`user:${id}`);
  return result;
}
```

## Example 3: Dependency-based Invalidation

```ts
@Cached({ ttl: 3_600_000, dependencies: ['user:*', 'role:*'] })
async getUserWithRole(id: string) {
  return this.userService.getUserWithRole(id);
}
```

## Example 4: Cache-aside with Single-flight

```ts
async findPublicProperties(query: QueryPropertyDto) {
  const cacheKey = this.generateCacheKey(query);
  return this.cacheService.getOrSet(
    cacheKey,
    () => this.fetchListingsPage(query),
    300_000,
  );
}
```

## Example 5: Cascade Invalidation on Mutation

```ts
async updateProperty(id: string, dto: UpdatePropertyDto, user: User) {
  const property = await this.findOne(id);
  this.verifyOwnership(property, user);
  Object.assign(property, dto);
  const saved = await this.propertyRepository.save(property);

  await this.cacheService.invalidatePropertyDomainCaches(id);
  return saved;
}
```

## Example 6: Monitoring Hit/Miss Ratios

```ts
@Get('cache/stats')
getCacheStats() {
  return this.cacheService.getStats();
}
```
