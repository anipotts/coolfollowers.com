import { format } from "date-fns";
import {
  loadPostsSafe,
  loadProfileSafe,
  calculateStats,
  getPostsByMonth,
  getTopPostsByLikes,
  getTopPostsByComments,
  getHashtagStats,
  getTimingStats,
} from "@/lib/ig/load";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/stats-card";
import { RefreshButton } from "@/components/refresh-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata = {
  title: "Insights",
};

export default async function InsightsPage() {
  const [posts, profile] = await Promise.all([
    loadPostsSafe(),
    loadProfileSafe(),
  ]);
  const stats = calculateStats(posts);
  const topPostsByLikes = getTopPostsByLikes(posts, 10);
  const topPostsByComments = getTopPostsByComments(posts, 10);
  const postsByMonth = getPostsByMonth(posts);
  const hashtagStats = getHashtagStats(posts).slice(0, 15);
  const timingStats = getTimingStats(posts);

  // Convert map to sorted array for display
  const monthlyData = Array.from(postsByMonth.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 12);

  // Calculate engagement rate
  const engagementRate = profile && posts.length > 0
    ? ((stats.totalLikes + stats.totalComments) / posts.length / profile.followersCount * 100).toFixed(2)
    : null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-start mb-8">
        <h1 className="text-3xl font-bold">Insights</h1>
        <RefreshButton />
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          No posts found. Click Refresh Data to fetch your Instagram content.
        </div>
      ) : (
        <div className="space-y-8">
          {/* Aggregate Stats */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Overview</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatsCard
                title="Total Posts"
                value={stats.totalPosts}
                description="Posts analyzed"
              />
              <StatsCard
                title="Total Likes"
                value={stats.totalLikes}
                description="Across all posts"
              />
              <StatsCard
                title="Total Comments"
                value={stats.totalComments}
                description="Across all posts"
              />
              {engagementRate && (
                <StatsCard
                  title="Engagement Rate"
                  value={`${engagementRate}%`}
                  description="(Likes + Comments) / Followers"
                />
              )}
            </div>
          </section>

          {/* Best Time to Post */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Best Time to Post</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Best Day */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Best Day of Week</CardTitle>
                </CardHeader>
                <CardContent>
                  {timingStats.bestDay ? (
                    <div className="space-y-4">
                      <div className="text-3xl font-bold text-primary">
                        {timingStats.bestDay}
                      </div>
                      <div className="space-y-2">
                        {timingStats.byDay.map((day) => (
                          <div key={day.day} className="flex items-center gap-3">
                            <span className="w-20 text-sm text-muted-foreground">
                              {day.day.slice(0, 3)}
                            </span>
                            <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  day.day === timingStats.bestDay
                                    ? "bg-primary"
                                    : "bg-muted-foreground/30"
                                }`}
                                style={{
                                  width: `${
                                    (day.avgLikes /
                                      Math.max(...timingStats.byDay.map((d) => d.avgLikes || 1))) *
                                    100
                                  }%`,
                                }}
                              />
                            </div>
                            <span className="w-16 text-xs text-right text-muted-foreground">
                              {day.avgLikes} avg
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Not enough data</p>
                  )}
                </CardContent>
              </Card>

              {/* Best Hour */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Best Hour (UTC)</CardTitle>
                </CardHeader>
                <CardContent>
                  {timingStats.bestHour !== null ? (
                    <div className="space-y-4">
                      <div className="text-3xl font-bold text-primary">
                        {timingStats.bestHour}:00
                      </div>
                      <div className="grid grid-cols-12 gap-1">
                        {timingStats.byHour.map((hour) => {
                          const maxLikes = Math.max(
                            ...timingStats.byHour.map((h) => h.avgLikes || 1)
                          );
                          const height = (hour.avgLikes / maxLikes) * 100;
                          const isBest = hour.hour === timingStats.bestHour;
                          return (
                            <div
                              key={hour.hour}
                              className="flex flex-col items-center"
                              title={`${hour.hour}:00 - ${hour.avgLikes} avg likes`}
                            >
                              <div className="h-16 w-full bg-muted rounded-t flex flex-col justify-end">
                                <div
                                  className={`w-full rounded-t transition-all ${
                                    isBest ? "bg-primary" : "bg-muted-foreground/30"
                                  }`}
                                  style={{ height: `${Math.max(height, 5)}%` }}
                                />
                              </div>
                              <span className="text-[9px] text-muted-foreground mt-1">
                                {hour.hour}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Not enough data</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Hashtag Performance */}
          {hashtagStats.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-4">Top Hashtags</h2>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-wrap gap-2">
                    {hashtagStats.map((ht, i) => (
                      <Badge
                        key={ht.tag}
                        variant={i < 3 ? "default" : "secondary"}
                        className="text-sm py-1 px-3"
                      >
                        #{ht.tag}
                        <span className="ml-2 text-xs opacity-70">
                          {ht.count}× · {ht.avgLikes} avg
                        </span>
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Top Posts Tabs */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Top Posts</h2>
            <Tabs defaultValue="likes">
              <TabsList>
                <TabsTrigger value="likes">By Likes</TabsTrigger>
                <TabsTrigger value="comments">By Comments</TabsTrigger>
              </TabsList>
              <TabsContent value="likes">
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
                        {topPostsByLikes.map((post, index) => (
                          <TableRow key={post.id}>
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell>
                              {format(new Date(post.timestamp), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {post.typename || post.mediaType || "image"}
                              </Badge>
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
              </TabsContent>
              <TabsContent value="comments">
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Caption</TableHead>
                          <TableHead className="text-right">Comments</TableHead>
                          <TableHead className="text-right">Likes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topPostsByComments.map((post, index) => (
                          <TableRow key={post.id}>
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell>
                              {format(new Date(post.timestamp), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {post.typename || post.mediaType || "image"}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {post.caption || (
                                <span className="text-muted-foreground italic">
                                  No caption
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {post.commentCount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              {post.likeCount.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
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

          {/* More Stats */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Additional Metrics</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              <StatsCard
                title="Average Comments"
                value={stats.avgComments}
                description="Per post"
              />
              <StatsCard
                title="Like:Comment Ratio"
                value={
                  stats.totalComments > 0
                    ? (stats.totalLikes / stats.totalComments).toFixed(1)
                    : "N/A"
                }
                description="Likes per comment"
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
