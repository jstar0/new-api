package model

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetUsageLeaderboardRanksByConsumedTokens(t *testing.T) {
	truncateTables(t)

	insertAffLeaderboardUser(t, &User{Id: 1, Username: "alice", DisplayName: "Alice User"})
	insertAffLeaderboardUser(t, &User{Id: 2, Username: "bob@example.com"})
	insertAffLeaderboardUser(t, &User{Id: 3, Username: "ignored-user"})

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

	leaderboard, err := GetUsageLeaderboard(10)
	require.NoError(t, err)
	require.Len(t, leaderboard, 2)

	assert.Equal(t, 1, leaderboard[0].Rank)
	assert.False(t, strings.Contains(leaderboard[0].DisplayName, "@"), "email-like usernames should be masked")
	assert.EqualValues(t, 1, leaderboard[0].RequestCount)
	assert.EqualValues(t, 2200, leaderboard[0].ConsumeTokens)
	assert.EqualValues(t, 90, leaderboard[0].ConsumeQuota)
	assert.EqualValues(t, 120, leaderboard[0].LatestConsumeTime)

	assert.Equal(t, 2, leaderboard[1].Rank)
	assert.EqualValues(t, 2, leaderboard[1].RequestCount)
	assert.EqualValues(t, 2000, leaderboard[1].ConsumeTokens)
	assert.EqualValues(t, 150, leaderboard[1].ConsumeQuota)
	assert.EqualValues(t, 110, leaderboard[1].LatestConsumeTime)
}
