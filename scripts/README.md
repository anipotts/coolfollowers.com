# Instagram Data Refresh Scripts

## Important Notice

**These scripts are for LOCAL USE ONLY.**

- Do NOT run these scripts on Vercel or any production server
- Do NOT include Instagram credentials in the repository
- Run locally on your development machine, then commit the resulting JSON files

## Prerequisites

1. Python 3.8 or higher
2. Install Instaloader:

```bash
pip install instaloader
```

## Usage

### Basic Usage

Fetch profile and posts for a username:

```bash
python scripts/refresh_instagram_data.py anipottsbuilds
```

### Options

```bash
# Fetch more posts (default: 50)
python scripts/refresh_instagram_data.py anipottsbuilds --max-posts 100

# Fetch likers (requires login, rate-limited)
python scripts/refresh_instagram_data.py anipottsbuilds --fetch-likers
```

### Login (Optional)

To access more data or avoid rate limits, you can log in:

1. Open the script and uncomment the login section
2. Or use session files (recommended):

```python
# Save session (run once in Python shell)
import instaloader
L = instaloader.Instaloader()
L.login("your_username", "your_password")
L.save_session_to_file()

# Then in the script, load session:
loader.load_session_from_file("your_username")
```

## Output

The script outputs two JSON files:

- `data/instagram/profile.json` - Profile information
- `data/instagram/posts.json` - Array of posts

## After Running

Commit the updated JSON files:

```bash
git add data/instagram/*.json
git commit -m "Update Instagram data"
git push
```

The deployed site will automatically reflect the new data on the next deployment.

## Rate Limits

Instagram has rate limits. If you encounter errors:

1. Wait a few minutes before retrying
2. Reduce `--max-posts` value
3. Avoid `--fetch-likers` unless necessary
4. Use login for higher limits

## Security Reminders

- Never commit Instagram credentials
- Never commit session files
- Add sensitive files to `.gitignore`:
  ```
  *.session
  .instaloader-*
  ```

## Troubleshooting

**"Profile does not exist"**
- Check the username spelling
- Ensure the profile is public

**"Private profile"**
- You need to be logged in and following the account

**"Too many requests"**
- Wait 10-15 minutes and try again
- Reduce the number of posts fetched

**"Login required"**
- Some data (like likers) requires authentication
- Set up session login as described above
