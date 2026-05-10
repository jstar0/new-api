package model

type UsageLeaderboardItem struct {
	Rank              int    `json:"rank"`
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

func GetUsageLeaderboard(limit int) ([]UsageLeaderboardItem, error) {
	if limit <= 0 || limit > 50 {
		limit = 10
	}

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
GROUP BY user_id
HAVING SUM(COALESCE(prompt_tokens, 0) + COALESCE(completion_tokens, 0)) > 0
	OR SUM(COALESCE(quota, 0)) > 0
ORDER BY consume_tokens DESC, consume_quota DESC, request_count DESC, latest_consume_time DESC, user_id ASC
LIMIT ?`,
		LogTypeConsume,
		limit,
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

		items = append(items, UsageLeaderboardItem{
			Rank:              i + 1,
			DisplayName:       maskAffLeaderboardName(displayName, row.UserId),
			RequestCount:      row.RequestCount,
			ConsumeTokens:     row.ConsumeTokens,
			ConsumeQuota:      row.ConsumeQuota,
			LatestConsumeTime: row.LatestConsumeTime,
		})
	}
	return items, nil
}
