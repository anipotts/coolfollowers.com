import { format } from "date-fns";
import {
  loadPostsSafe,
  calculateStats,
  getPostsByMonth,
  getTopPostsByLikes,
} from "@/lib/ig/load";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/stats-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Insights",
};

export default async function InsightsPage() {
  const posts = await loadPostsSafe();
  const stats = calculateStats(posts);
  const topPosts = getTopPostsByLikes(posts, 10);
  const postsByMonth = getPostsByMonth(posts);

  // Convert map to sorted array for display
  const monthlyData = Array.from(postsByMonth.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 12);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Insights</h1>

      {posts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          No posts found. Run the refresh script to load data.
        </div>
      ) : (
        <div className="space-y-8">
          {/* Aggregate Stats */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Aggregate Statistics</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatsCard
                title="Total Posts"
                value={stats.totalPosts}
                description="Posts tracked"
              />
              <StatsCard
                title="Total Likes"
                value={stats.totalLikes}
                description="Across all posts"
              />
              <StatsCard
                title="Average Likes"
                value={stats.avgLikes}
                description="Per post"
              />
              <StatsCard
                title="Median Likes"
                value={stats.medianLikes}
                description="Middle value"
              />
            </div>
          </section>

          {/* Top Posts */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Top 10 Posts by Likes</h2>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Caption</TableHead>
                      <TableHead className="text-right">Likes</TableHead>
                      <TableHead className="text-right">Comments</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topPosts.map((post, index) => (
                      <TableRow key={post.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>
                          {format(new Date(post.timestamp), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{post.mediaType}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {post.caption || (
                            <span className="text-muted-foreground italic">
                              No caption
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {post.likeCount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {post.commentCount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </section>

          {/* Posting Frequency */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Posting Frequency</h2>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Posts by Month</CardTitle>
              </CardHeader>
              <CardContent>
                {monthlyData.length > 0 ? (
                  <div className="space-y-3">
                    {monthlyData.map(([month, data]) => {
                      const maxCount = Math.max(
                        ...monthlyData.map(([, d]) => d.count)
                      );
                      const percentage = (data.count / maxCount) * 100;
                      const [year, monthNum] = month.split("-");
                      const monthName = format(
                        new Date(parseInt(year), parseInt(monthNum) - 1),
                        "MMMM yyyy"
                      );

                      return (
                        <div key={month} className="flex items-center gap-4">
                          <div className="w-28 text-sm text-muted-foreground">
                            {monthName}
                          </div>
                          <div className="flex-1">
                            <div className="h-6 bg-muted rounded-md overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                          <div className="w-8 text-sm font-medium text-right">
                            {data.count}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No monthly data available.</p>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Engagement Summary */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Engagement Summary</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Total Comments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {stats.totalComments.toLocaleString()}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Average {stats.avgComments} per post
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Engagement Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {stats.totalPosts > 0
                      ? (
                          ((stats.totalLikes + stats.totalComments) /
                            stats.totalPosts) *
                          100
                        ).toFixed(1)
                      : 0}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Average engagement per post
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
