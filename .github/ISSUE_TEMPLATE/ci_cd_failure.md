---
name: 🚨 CI/CD Pipeline Failure
about: Report a CI/CD pipeline failure
title: "[CI/CD] Brief description of the pipeline failure"
labels: ci-cd
assignees: ''
---

## 📝 Description
<!-- Clear description of the CI/CD failure -->

## 🔴 Failed Job
<!-- Which job failed? -->
- **Pipeline**: Frontend / Backend / Contract
- **Job**: (e.g., lint, test, build, deploy)
- **Branch**: (e.g., main, develop)
- **Commit**: (link to commit)

## 📊 Failure Details
<!-- What failed and why? -->

### Error Message
```
Paste the error message here
```

### Logs
<!-- Attach relevant logs -->
- **Build Log**: 
- **Test Output**: 
- **Other Logs**: 

## 🔍 Root Cause
<!-- What's causing the failure? -->

## 💡 Solution
<!-- How to fix it? -->

## 🌍 Environment
<!-- Fill in the relevant details -->
- **OS**: (e.g., ubuntu-latest)
- **Node Version**: (if applicable)
- **Rust Version**: (if applicable)
- **Database**: (if applicable)

## 🔗 Related Issues
<!-- Link to related issues if any -->

## 📋 Checklist
- [ ] I've identified the failed job
- [ ] I've included error logs
- [ ] I've identified the root cause
- [ ] I've proposed a solution
- [ ] I've verified locally (if applicable)
