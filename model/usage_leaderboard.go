package model

import (
	"fmt"
	"strings"
	"time"
)

const (
	UsageLeaderboardPeriodDay   = "day"
	UsageLeaderboardPeriodWeek  = "week"
	UsageLeaderboardPeriodMonth = "month"
	UsageLeaderboardPeriodAll   = "all"
)

type UsageLeaderboardItem struct {
	Rank              int    `json:"rank"`
	UserId            int    `json:"user_id,omitempty"`
	DisplayName       string `json:"display_name"`
	RequestCount      int64  `json:"request_count"`
	ConsumeTokens     int64  `json:"consume_tokens"`
	ConsumeQuota      int64  `json:"consume_quota"`
	LatestConsumeTime int64  `json:"latest_consume_time"`
}

type usageLeaderboardRow struct {
	UserId            int
	DisplayName       string
	RequestCount      int64
	ConsumeTokens     int64
	ConsumeQuota      int64
	LatestConsumeTime int64
}

type usageLeaderboardUserName struct {
	Id          int
	DisplayName string
}

func GetUsageLeaderboard(limit int, period string) ([]UsageLeaderboardItem, error) {
	return getUsageLeaderboard(limit, period, time.Now())
}

func getUsageLeaderboard(limit int, period string, now time.Time) ([]UsageLeaderboardItem, error) {
	since := usageLeaderboardStartTime(period, now)
	return getUsageLeaderboardInRange(limit, since, 0)
}

func getUsageLeaderboardBetween(limit int, start int64, end int64) ([]UsageLeaderboardItem, error) {
	return getUsageLeaderboardInRange(limit, start, end)
}

func getUsageLeaderboardInRange(limit int, start int64, end int64) ([]UsageLeaderboardItem, error) {
	if limit <= 0 || limit > 50 {
		limit = 10
	}

	whereCreatedAt := ""
	args := []any{LogTypeConsume}
	if start > 0 {
		whereCreatedAt = "\n\tAND created_at >= ?"
		args = append(args, start)
	}
	if end > 0 {
		whereCreatedAt += "\n\tAND created_at < ?"
		args = append(args, end)
	}
	args = append(args, limit)

	rows := make([]usageLeaderboardRow, 0, limit)
	err := LOG_DB.Raw(`
SELECT
	user_id,
	COALESCE(NULLIF(MAX(username), ''), '') AS display_name,
	COUNT(*) AS request_count,
	COALESCE(SUM(COALESCE(prompt_tokens, 0) + COALESCE(completion_tokens, 0)), 0) AS consume_tokens,
	COALESCE(SUM(COALESCE(quota, 0)), 0) AS consume_quota,
	COALESCE(MAX(created_at), 0) AS latest_consume_time
FROM logs
WHERE user_id > 0
	AND type = ?
`+whereCreatedAt+`
GROUP BY user_id
HAVING SUM(COALESCE(quota, 0)) > 0
ORDER BY consume_quota DESC, request_count DESC, consume_tokens DESC, latest_consume_time DESC, user_id ASC
LIMIT ?`,
		args...,
	).Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	userIds := make([]int, 0, len(rows))
	for _, row := range rows {
		userIds = append(userIds, row.UserId)
	}

	nameByUserId := make(map[int]string, len(rows))
	if len(userIds) > 0 {
		userNames := make([]usageLeaderboardUserName, 0, len(userIds))
		err = DB.Model(&User{}).
			Select("id, COALESCE(NULLIF(display_name, ''), username) AS display_name").
			Where("id IN ? AND deleted_at IS NULL", userIds).
			Scan(&userNames).Error
		if err != nil {
			return nil, err
		}
		for _, userName := range userNames {
			nameByUserId[userName.Id] = userName.DisplayName
		}
	}

	items := make([]UsageLeaderboardItem, 0, len(rows))
	for i, row := range rows {
		displayName := row.DisplayName
		if userName, ok := nameByUserId[row.UserId]; ok && userName != "" {
			displayName = userName
		}
		if displayName == "" {
			displayName = fmt.Sprintf("User #%d", row.UserId)
		}

		items = append(items, UsageLeaderboardItem{
			Rank:              i + 1,
			UserId:            row.UserId,
			DisplayName:       displayName,
			RequestCount:      row.RequestCount,
			ConsumeTokens:     row.ConsumeTokens,
			ConsumeQuota:      row.ConsumeQuota,
			LatestConsumeTime: row.LatestConsumeTime,
		})
	}
	return items, nil
}

func usageLeaderboardStartTime(period string, now time.Time) int64 {
	switch normalizeUsageLeaderboardPeriod(period) {
	case UsageLeaderboardPeriodDay:
		return time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location()).Unix()
	case UsageLeaderboardPeriodWeek:
		startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		daysSinceMonday := (int(now.Weekday()) + 6) % 7
		return startOfDay.AddDate(0, 0, -daysSinceMonday).Unix()
	case UsageLeaderboardPeriodMonth:
		return time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).Unix()
	default:
		return 0
	}
}

func normalizeUsageLeaderboardPeriod(period string) string {
	switch strings.ToLower(strings.TrimSpace(period)) {
	case UsageLeaderboardPeriodDay, "daily", "today":
		return UsageLeaderboardPeriodDay
	case UsageLeaderboardPeriodWeek, "weekly", "this_week":
		return UsageLeaderboardPeriodWeek
	case UsageLeaderboardPeriodMonth, "monthly", "this_month":
		return UsageLeaderboardPeriodMonth
	default:
		return UsageLeaderboardPeriodAll
	}
}
