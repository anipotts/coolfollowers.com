"""
Instagram Data Refresh API
Vercel Python Serverless Function

This function fetches Instagram data using Instaloader and stores it in Vercel KV.
"""

import os
import json
import base64
import tempfile
from datetime import datetime
from http.server import BaseHTTPRequestHandler
from urllib.request import Request, urlopen
from urllib.error import HTTPError
import instaloader

# Configuration
IG_USERNAME = os.environ.get("IG_USERNAME", "anipottsbuilds")
IG_SESSION_DATA = os.environ.get("IG_SESSION_DATA", "")
KV_REST_API_URL = os.environ.get("KV_REST_API_URL", "")
KV_REST_API_TOKEN = os.environ.get("KV_REST_API_TOKEN", "")
MAX_POSTS = int(os.environ.get("MAX_POSTS", "50"))
MAX_LIKERS_PER_POST = int(os.environ.get("MAX_LIKERS_PER_POST", "50"))
MAX_COMMENTS_PER_POST = int(os.environ.get("MAX_COMMENTS_PER_POST", "50"))
MAX_FOLLOWERS = int(os.environ.get("MAX_FOLLOWERS", "1000"))
CACHE_TTL = int(os.environ.get("CACHE_TTL_SECONDS", "3600"))


def kv_set(key: str, value, ttl: int = CACHE_TTL):
    """Set a value in Vercel KV using REST API."""
    if not KV_REST_API_URL or not KV_REST_API_TOKEN:
        raise ValueError("KV credentials not configured")

    # Vercel KV REST API endpoint for SET with EX (expiry)
    url = f"{KV_REST_API_URL}/set/{key}?ex={ttl}"
    data = json.dumps(value).encode('utf-8')

    req = Request(url, data=data, method='POST')
    req.add_header('Authorization', f'Bearer {KV_REST_API_TOKEN}')
    req.add_header('Content-Type', 'application/json')

    try:
        with urlopen(req) as response:
            return response.status == 200
    except HTTPError as e:
        print(f"KV SET error for {key}: {e}")
        return False


def kv_get(key: str):
    """Get a value from Vercel KV using REST API."""
    if not KV_REST_API_URL or not KV_REST_API_TOKEN:
        raise ValueError("KV credentials not configured")

    url = f"{KV_REST_API_URL}/get/{key}"

    req = Request(url, method='GET')
    req.add_header('Authorization', f'Bearer {KV_REST_API_TOKEN}')

    try:
        with urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            return result.get('result')
    except HTTPError as e:
        print(f"KV GET error for {key}: {e}")
        return None


def load_session(loader: instaloader.Instaloader) -> bool:
    """Load Instagram session from base64-encoded env var."""
    if not IG_SESSION_DATA:
        print("No session data provided")
        return False

    try:
        # Decode base64 session data
        session_bytes = base64.b64decode(IG_SESSION_DATA)

        # Write to temp file
        with tempfile.NamedTemporaryFile(mode='wb', delete=False, suffix='.session') as f:
            f.write(session_bytes)
            session_path = f.name

        # Load session
        loader.load_session_from_file(IG_USERNAME, session_path)

        # Clean up
        os.unlink(session_path)

        print(f"Session loaded for {IG_USERNAME}")
        return True
    except Exception as e:
        print(f"Failed to load session: {e}")
        return False


def fetch_profile(loader: instaloader.Instaloader) -> dict:
    """Fetch profile data for the configured username."""
    profile = instaloader.Profile.from_username(loader.context, IG_USERNAME)

    return {
        "username": profile.username,
        "userid": str(profile.userid),
        "fullName": profile.full_name or "",
        "biography": profile.biography or "",
        "bio": profile.biography or "",  # Legacy
        "externalUrl": profile.external_url,
        "profilePicUrl": profile.profile_pic_url,
        "isPrivate": profile.is_private,
        "isVerified": profile.is_verified,
        "isBusinessAccount": profile.is_business_account,
        "businessCategory": getattr(profile, 'business_category_name', None),
        "followersCount": profile.followers,
        "followingCount": profile.followees,
        "postsCount": profile.mediacount,
        "igtvCount": getattr(profile, 'igtvcount', 0) or 0,
        "biographyHashtags": list(profile.biography_hashtags) if hasattr(profile, 'biography_hashtags') else [],
        "biographyMentions": list(profile.biography_mentions) if hasattr(profile, 'biography_mentions') else [],
        "lastUpdated": datetime.utcnow().isoformat() + "Z",
    }


def fetch_posts(loader: instaloader.Instaloader, fetch_likers: bool = True, fetch_comments: bool = True) -> list:
    """Fetch posts with metadata, optionally including likers and comments."""
    profile = instaloader.Profile.from_username(loader.context, IG_USERNAME)
    posts = []

    for i, post in enumerate(profile.get_posts()):
        if i >= MAX_POSTS:
            break

        print(f"Fetching post {i + 1}/{MAX_POSTS}: {post.shortcode}")

        # Determine media type
        typename = post.typename
        if typename == "GraphVideo":
            media_type = "video"
        elif typename == "GraphSidecar":
            media_type = "carousel"
        else:
            media_type = "image"

        # Get media URLs
        media_urls = []
        sidecar_items = []
        if post.typename == "GraphSidecar":
            for node in post.get_sidecar_nodes():
                media_urls.append(node.display_url)
                sidecar_items.append({
                    "isVideo": node.is_video,
                    "displayUrl": node.display_url,
                    "videoUrl": getattr(node, 'video_url', None),
                })
        else:
            media_urls.append(post.url)

        # Location
        location = None
        if post.location:
            location = {
                "id": str(post.location.id) if post.location.id else "",
                "name": post.location.name or "",
                "slug": getattr(post.location, 'slug', None),
                "lat": post.location.lat,
                "lng": post.location.lng,
            }

        # Build post data
        post_data = {
            "id": str(post.mediaid),
            "shortcode": post.shortcode,
            "typename": typename,
            "caption": post.caption,
            "captionHashtags": list(post.caption_hashtags) if post.caption_hashtags else [],
            "captionMentions": list(post.caption_mentions) if post.caption_mentions else [],
            "taggedUsers": [u.username for u in post.tagged_users] if hasattr(post, 'tagged_users') and post.tagged_users else [],
            "mediaType": media_type,
            "mediaUrl": post.url,
            "mediaUrls": media_urls,
            "videoUrl": post.video_url if post.is_video else None,
            "videoDuration": getattr(post, 'video_duration', None),
            "sidecarItems": sidecar_items,
            "likeCount": post.likes,
            "commentCount": post.comments,
            "videoViewCount": getattr(post, 'video_view_count', None),
            "location": location,
            "permalink": f"https://www.instagram.com/p/{post.shortcode}/",
            "timestamp": post.date_utc.isoformat() + "Z",
            "isVideo": post.is_video,
            "isPinned": getattr(post, 'is_pinned', False),
            "isSponsored": post.is_sponsored,
            "likers": [],
            "comments": [],
        }

        # Fetch likers (rate limited!)
        if fetch_likers:
            try:
                likers = []
                for j, liker in enumerate(post.get_likes()):
                    if j >= MAX_LIKERS_PER_POST:
                        break
                    likers.append({
                        "username": liker.username,
                        "fullName": liker.full_name,
                        "profilePicUrl": liker.profile_pic_url,
                        "isVerified": liker.is_verified,
                        "isPrivate": liker.is_private,
                    })
                post_data["likers"] = likers
            except Exception as e:
                print(f"  Failed to fetch likers: {e}")

        # Fetch comments
        if fetch_comments:
            try:
                comments = []
                for j, comment in enumerate(post.get_comments()):
                    if j >= MAX_COMMENTS_PER_POST:
                        break

                    # Get replies
                    replies = []
                    if hasattr(comment, 'answers'):
                        for k, reply in enumerate(comment.answers):
                            if k >= 5:  # Limit replies
                                break
                            replies.append({
                                "id": str(reply.id),
                                "text": reply.text,
                                "timestamp": reply.created_at_utc.isoformat() + "Z",
                                "likesCount": reply.likes_count,
                                "owner": {
                                    "username": reply.owner.username,
                                    "fullName": reply.owner.full_name,
                                    "profilePicUrl": reply.owner.profile_pic_url,
                                    "isVerified": reply.owner.is_verified,
                                    "isPrivate": reply.owner.is_private,
                                },
                                "replies": [],
                            })

                    comments.append({
                        "id": str(comment.id),
                        "text": comment.text,
                        "timestamp": comment.created_at_utc.isoformat() + "Z",
                        "likesCount": comment.likes_count,
                        "owner": {
                            "username": comment.owner.username,
                            "fullName": comment.owner.full_name,
                            "profilePicUrl": comment.owner.profile_pic_url,
                            "isVerified": comment.owner.is_verified,
                            "isPrivate": comment.owner.is_private,
                        },
                        "replies": replies,
                    })
                post_data["comments"] = comments
            except Exception as e:
                print(f"  Failed to fetch comments: {e}")

        posts.append(post_data)

    return posts


def fetch_followers(loader: instaloader.Instaloader) -> list:
    """Fetch followers list."""
    profile = instaloader.Profile.from_username(loader.context, IG_USERNAME)
    followers = []

    try:
        for i, follower in enumerate(profile.get_followers()):
            if i >= MAX_FOLLOWERS:
                break
            followers.append({
                "username": follower.username,
                "fullName": follower.full_name,
                "profilePicUrl": follower.profile_pic_url,
                "isVerified": follower.is_verified,
                "isPrivate": follower.is_private,
            })
            if (i + 1) % 100 == 0:
                print(f"Fetched {i + 1} followers...")
    except Exception as e:
        print(f"Failed to fetch followers: {e}")

    return followers


def fetch_following(loader: instaloader.Instaloader) -> list:
    """Fetch following list."""
    profile = instaloader.Profile.from_username(loader.context, IG_USERNAME)
    following = []

    try:
        for i, followee in enumerate(profile.get_followees()):
            if i >= MAX_FOLLOWERS:
                break
            following.append({
                "username": followee.username,
                "fullName": followee.full_name,
                "profilePicUrl": followee.profile_pic_url,
                "isVerified": followee.is_verified,
                "isPrivate": followee.is_private,
            })
            if (i + 1) % 100 == 0:
                print(f"Fetched {i + 1} following...")
    except Exception as e:
        print(f"Failed to fetch following: {e}")

    return following


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        """Handle refresh request."""
        try:
            # Check if already running
            status = kv_get("ig:refresh_status")
            if status == "running":
                self.send_response(409)
                self.send_header("Content-type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Refresh already in progress"}).encode())
                return

            # Set status to running
            kv_set("ig:refresh_status", "running", ttl=300)

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

            # Load session
            if not load_session(loader):
                kv_set("ig:refresh_status", "error:session_failed", ttl=300)
                self.send_response(500)
                self.send_header("Content-type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Failed to load Instagram session"}).encode())
                return

            # Fetch and store profile
            print("Fetching profile...")
            profile = fetch_profile(loader)
            kv_set(f"ig:profile:{IG_USERNAME}", profile)

            # Fetch and store posts
            print("Fetching posts...")
            posts = fetch_posts(loader, fetch_likers=True, fetch_comments=True)
            kv_set(f"ig:posts:{IG_USERNAME}", posts)

            # Fetch and store followers (optional, slower)
            print("Fetching followers...")
            followers = fetch_followers(loader)
            kv_set(f"ig:followers:{IG_USERNAME}", followers)

            # Fetch and store following
            print("Fetching following...")
            following = fetch_following(loader)
            kv_set(f"ig:following:{IG_USERNAME}", following)

            # Update last refresh time and status
            kv_set(f"ig:last_refresh:{IG_USERNAME}", datetime.utcnow().isoformat() + "Z", ttl=86400)
            kv_set("ig:refresh_status", "complete", ttl=300)

            # Return success
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": True,
                "profile": profile["username"],
                "postsCount": len(posts),
                "followersCount": len(followers),
                "followingCount": len(following),
                "timestamp": datetime.utcnow().isoformat() + "Z",
            }).encode())

        except Exception as e:
            print(f"Error during refresh: {e}")
            try:
                kv_set("ig:refresh_status", f"error:{str(e)[:50]}", ttl=300)
            except:
                pass

            self.send_response(500)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def do_GET(self):
        """Return refresh status."""
        try:
            status = kv_get("ig:refresh_status") or "idle"
            last_refresh = kv_get(f"ig:last_refresh:{IG_USERNAME}")

            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": status,
                "lastRefresh": last_refresh,
            }).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
