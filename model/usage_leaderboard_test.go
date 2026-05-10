package model

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetUsageLeaderboardRanksByConsumedQuota(t *testing.T) {
	truncateTables(t)

	insertAffLeaderboardUser(t, &User{Id: 1, Username: "alice", DisplayName: "Alice User"})
	insertAffLeaderboardUser(t, &User{Id: 2, Username: "bob@example.com"})
	insertAffLeaderboardUser(t, &User{Id: 3, Username: "ignored-user"})
	insertAffLeaderboardUser(t, &User{Id: 4, Username: "free-model-user"})

	require.NoError(t, LOG_DB.Create(&Log{
		UserId:           1,
		Username:         "alice",
		Type:             LogTypeConsume,
		PromptTokens:     1000,
		CompletionTokens: 500,
		Quota:            100,
		CreatedAt:        100,
	}).Error)
	require.NoError(t, LOG_DB.Create(&Log{
		UserId:           1,
		Username:         "alice",
		Type:             LogTypeConsume,
		PromptTokens:     200,
		CompletionTokens: 300,
		Quota:            50,
		CreatedAt:        110,
	}).Error)
	require.NoError(t, LOG_DB.Create(&Log{
		UserId:           2,
		Username:         "bob@example.com",
		Type:             LogTypeConsume,
		PromptTokens:     1500,
		CompletionTokens: 700,
		Quota:            90,
		CreatedAt:        120,
	}).Error)
	require.NoError(t, LOG_DB.Create(&Log{
		UserId:           3,
		Username:         "ignored-user",
		Type:             LogTypeSystem,
		PromptTokens:     9999,
		CompletionTokens: 9999,
		Quota:            999,
		CreatedAt:        130,
	}).Error)
	require.NoError(t, LOG_DB.Create(&Log{
		UserId:           0,
		Username:         "anonymous",
		Type:             LogTypeConsume,
		PromptTokens:     9999,
		CompletionTokens: 9999,
		Quota:            999,
		CreatedAt:        140,
	}).Error)
	require.NoError(t, LOG_DB.Create(&Log{
		UserId:           4,
		Username:         "free-model-user",
		Type:             LogTypeConsume,
		PromptTokens:     9999,
		CompletionTokens: 9999,
		Quota:            0,
		CreatedAt:        150,
	}).Error)

	leaderboard, err := GetUsageLeaderboard(10, "all")
	require.NoError(t, err)
	require.Len(t, leaderboard, 2)

	assert.Equal(t, 1, leaderboard[0].Rank)
	assert.EqualValues(t, 2, leaderboard[0].RequestCount)
	assert.EqualValues(t, 2000, leaderboard[0].ConsumeTokens)
	assert.EqualValues(t, 150, leaderboard[0].ConsumeQuota)
	assert.EqualValues(t, 110, leaderboard[0].LatestConsumeTime)

	assert.Equal(t, 2, leaderboard[1].Rank)
	assert.Equal(t, "bob@example.com", leaderboard[1].DisplayName)
	assert.EqualValues(t, 1, leaderboard[1].RequestCount)
	assert.EqualValues(t, 2200, leaderboard[1].ConsumeTokens)
	assert.EqualValues(t, 90, leaderboard[1].ConsumeQuota)
	assert.EqualValues(t, 120, leaderboard[1].LatestConsumeTime)
}

func TestGetUsageLeaderboardFiltersByPeriod(t *testing.T) {
	truncateTables(t)

	insertAffLeaderboardUser(t, &User{Id: 1, Username: "daily-winner"})
	insertAffLeaderboardUser(t, &User{Id: 2, Username: "weekly-winner"})
	insertAffLeaderboardUser(t, &User{Id: 3, Username: "monthly-winner"})
	insertAffLeaderboardUser(t, &User{Id: 4, Username: "all-time-winner"})

	now := time.Date(2026, 5, 10, 12, 0, 0, 0, time.Local)
	startOfDay := time.Date(2026, 5, 10, 0, 0, 0, 0, time.Local).Unix()
	startOfWeek := time.Date(2026, 5, 4, 0, 0, 0, 0, time.Local).Unix()
	startOfMonth := time.Date(2026, 5, 1, 0, 0, 0, 0, time.Local).Unix()

	logs := []Log{
		{
			UserId:           1,
			Username:         "daily-winner",
			Type:             LogTypeConsume,
			PromptTokens:     800,
			CompletionTokens: 200,
			Quota:            100,
			CreatedAt:        startOfDay + 3600,
		},
		{
			UserId:           2,
			Username:         "weekly-winner",
			Type:             LogTypeConsume,
			PromptTokens:     1200,
			CompletionTokens: 300,
			Quota:            150,
			CreatedAt:        startOfWeek + 3600,
		},
		{
			UserId:           3,
			Username:         "monthly-winner",
			Type:             LogTypeConsume,
			PromptTokens:     3000,
			CompletionTokens: 1000,
			Quota:            400,
			CreatedAt:        startOfMonth + 3600,
		},
		{
			UserId:           4,
			Username:         "all-time-winner",
			Type:             LogTypeConsume,
			PromptTokens:     5000,
			CompletionTokens: 1000,
			Quota:            600,
			CreatedAt:        startOfMonth - 3600,
		},
	}
	require.NoError(t, LOG_DB.Create(&logs).Error)

	dayLeaderboard, err := getUsageLeaderboard(10, "day", now)
	require.NoError(t, err)
	require.Len(t, dayLeaderboard, 1)
	assert.EqualValues(t, 1000, dayLeaderboard[0].ConsumeTokens)

	weekLeaderboard, err := getUsageLeaderboard(10, "week", now)
	require.NoError(t, err)
	require.Len(t, weekLeaderboard, 2)
	assert.EqualValues(t, 1500, weekLeaderboard[0].ConsumeTokens)
	assert.EqualValues(t, 1000, weekLeaderboard[1].ConsumeTokens)

	monthLeaderboard, err := getUsageLeaderboard(10, "month", now)
	require.NoError(t, err)
	require.Len(t, monthLeaderboard, 3)
	assert.EqualValues(t, 4000, monthLeaderboard[0].ConsumeTokens)
	assert.EqualValues(t, 1500, monthLeaderboard[1].ConsumeTokens)
	assert.EqualValues(t, 1000, monthLeaderboard[2].ConsumeTokens)

	allLeaderboard, err := getUsageLeaderboard(10, "all", now)
	require.NoError(t, err)
	require.Len(t, allLeaderboard, 4)
	assert.EqualValues(t, 6000, allLeaderboard[0].ConsumeTokens)
}
