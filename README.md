# envault

> Encrypted `.env` file manager with team sharing support and audit logging.

## Installation

```bash
npm install -g envault
```

## Usage

Initialize a new vault in your project:

```bash
envault init
```

Add and encrypt environment variables:

```bash
envault set API_KEY=supersecret DATABASE_URL=postgres://localhost/mydb
```

Pull the latest secrets to a local `.env` file:

```bash
envault pull --env production
```

Share secrets with your team by pushing to a shared vault:

```bash
envault push --env staging
```

View the audit log to see who accessed or modified secrets:

```bash
envault log
```

### Example `.envaultrc`

```json
{
  "vault": "my-project",
  "region": "us-east-1",
  "team": "my-org"
}
```

## Features

- 🔐 AES-256 encryption for all stored secrets
- 👥 Team sharing with role-based access control
- 📋 Full audit logging of reads, writes, and deletions
- 🔄 CI/CD friendly — integrates with GitHub Actions, CircleCI, and more
- 🗂️ Multi-environment support (`development`, `staging`, `production`)

## License

MIT © [envault contributors](https://github.com/envault/envault)