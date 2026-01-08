import { loadPostsSafe } from "@/lib/ig/load";
import { PostsClient } from "./posts-client";

export const metadata = {
  title: "Posts",
};

export default async function PostsPage() {
  const posts = await loadPostsSafe();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Posts</h1>
      <PostsClient initialPosts={posts} />
    </div>
  );
}
