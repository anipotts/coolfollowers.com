#!/usr/bin/env python3
"""
Instagram Data Refresh Script

=============================================================================
WARNING: LOCAL USE ONLY - DO NOT RUN ON VERCEL OR ANY SERVER
=============================================================================

This script is intended to be run LOCALLY on your development machine only.
It uses Instaloader to fetch Instagram data and exports it to JSON files.

Run locally, then commit the updated JSON files to the repository.

Usage:
    python scripts/refresh_instagram_data.py <username>

Example:
    python scripts/refresh_instagram_data.py anipottsbuilds

Prerequisites:
    pip install instaloader

Note: You may need to log in for accessing some data. See Instaloader docs.
"""

import json
import sys
from datetime import datetime
from pathlib import Path

try:
    import instaloader
except ImportError:
    print("Error: instaloader is not installed.")
    print("Install it with: pip install instaloader")
    sys.exit(1)


# Output directory
OUTPUT_DIR = Path(__file__).parent.parent / "data" / "instagram"


def fetch_profile_data(loader: instaloader.Instaloader, username: str) -> dict:
    """Fetch profile information for a given username."""
    profile = instaloader.Profile.from_username(loader.context, username)

    return {
        "username": profile.username,
        "fullName": profile.full_name or "",
        "bio": profile.biography or "",
        "profilePicUrl": profile.profile_pic_url,
        "followersCount": profile.followers,
        "followingCount": profile.followees,
        "lastUpdated": datetime.utcnow().isoformat() + "Z",
    }


def fetch_posts_data(
    loader: instaloader.Instaloader,
    username: str,
    max_posts: int = 50,
    fetch_likers: bool = False,
) -> list:
    """
    Fetch posts for a given username.

    Args:
        loader: Instaloader instance
        username: Instagram username
        max_posts: Maximum number of posts to fetch
        fetch_likers: Whether to fetch likers (requires login, rate limited)
    """
    profile = instaloader.Profile.from_username(loader.context, username)
    posts = []

    for i, post in enumerate(profile.get_posts()):
        if i >= max_posts:
            break

        # Determine media type
        if post.typename == "GraphVideo":
            media_type = "video"
        elif post.typename == "GraphSidecar":
            media_type = "carousel"
        else:
            media_type = "image"

        # Get media URLs
        media_urls = []
        if post.typename == "GraphSidecar":
            for node in post.get_sidecar_nodes():
                media_urls.append(node.display_url)
        else:
            media_urls.append(post.url)

        # Fetch likers if requested (warning: rate limited!)
        likers = []
        if fetch_likers:
            try:
                for liker in post.get_likes():
                    likers.append({
                        "username": liker.username,
                        "fullName": liker.full_name or None,
                        "profilePicUrl": liker.profile_pic_url or None,
                    })
                    # Limit likers to first 20 to avoid rate limits
                    if len(likers) >= 20:
                        break
            except Exception as e:
                print(f"  Warning: Could not fetch likers for post {post.shortcode}: {e}")

        post_data = {
            "id": str(post.mediaid),
            "shortcode": post.shortcode,
            "caption": post.caption,
            "mediaType": media_type,
            "mediaUrls": media_urls,
            "permalink": f"https://www.instagram.com/p/{post.shortcode}/",
            "timestamp": post.date_utc.isoformat() + "Z",
            "likeCount": post.likes,
            "commentCount": post.comments,
            "likers": likers,
        }

        posts.append(post_data)
        print(f"  Fetched post {i + 1}/{max_posts}: {post.shortcode}")

    return posts


def save_json(data: dict | list, filename: str) -> None:
    """Save data to a JSON file."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    filepath = OUTPUT_DIR / filename

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Saved: {filepath}")


def main():
    if len(sys.argv) < 2:
        print("Usage: python refresh_instagram_data.py <username>")
        print("Example: python refresh_instagram_data.py anipottsbuilds")
        sys.exit(1)

    username = sys.argv[1]

    # Parse optional arguments
    max_posts = 50
    fetch_likers = False

    if "--max-posts" in sys.argv:
        idx = sys.argv.index("--max-posts")
        max_posts = int(sys.argv[idx + 1])

    if "--fetch-likers" in sys.argv:
        fetch_likers = True
        print("Warning: Fetching likers is rate-limited and may require login.")

    print(f"Refreshing Instagram data for @{username}")
    print(f"Max posts: {max_posts}")
    print(f"Fetch likers: {fetch_likers}")
    print("-" * 40)

    # Create Instaloader instance
    loader = instaloader.Instaloader(
        download_pictures=False,
        download_videos=False,
        download_video_thumbnails=False,
        download_geotags=False,
        download_comments=False,
        save_metadata=False,
        compress_json=False,
    )

    # Optional: Login for accessing more data
    # loader.login("your_username", "your_password")
    # Or load session:
    # loader.load_session_from_file("your_username")

    try:
        # Fetch and save profile
        print("Fetching profile...")
        profile_data = fetch_profile_data(loader, username)
        save_json(profile_data, "profile.json")

        # Fetch and save posts
        print(f"Fetching posts (max {max_posts})...")
        posts_data = fetch_posts_data(loader, username, max_posts, fetch_likers)
        save_json(posts_data, "posts.json")

        print("-" * 40)
        print("Done! Don't forget to commit the updated JSON files.")
        print("  git add data/instagram/*.json")
        print("  git commit -m 'Update Instagram data'")

    except instaloader.exceptions.ProfileNotExistsException:
        print(f"Error: Profile @{username} does not exist.")
        sys.exit(1)
    except instaloader.exceptions.PrivateProfileNotFollowedException:
        print(f"Error: Profile @{username} is private and you don't follow them.")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
