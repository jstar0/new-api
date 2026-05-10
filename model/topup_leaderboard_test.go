package model

import (
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetTopUpLeaderboardRanksBySuccessfulTopupsAndRedemptions(t *testing.T) {
	truncateTables(t)

	insertAffLeaderboardUser(t, &User{Id: 1, Username: "alice", DisplayName: "Alice Buyer"})
	insertAffLeaderboardUser(t, &User{Id: 2, Username: "bob@example.com"})
	insertAffLeaderboardUser(t, &User{Id: 3, Username: "failed-user"})

	require.NoError(t, DB.Create(&TopUp{
		UserId:          1,
		Amount:          2,
		Money:           8,
		TradeNo:         "topup-leaderboard-stripe",
		PaymentProvider: PaymentProviderStripe,
		CompleteTime:    100,
		Status:          common.TopUpStatusSuccess,
	}).Error)
	require.NoError(t, DB.Create(&Redemption{
		Key:          "topup-leaderboard-used",
		UsedUserId:   1,
		Quota:        2000000,
		Status:       common.RedemptionCodeStatusUsed,
		RedeemedTime: 110,
	}).Error)
	require.NoError(t, DB.Create(&TopUp{
		UserId:          2,
		Amount:          20,
		Money:           20,
		TradeNo:         "topup-leaderboard-waffo",
		PaymentProvider: PaymentProviderWaffo,
		CompleteTime:    120,
		Status:          common.TopUpStatusSuccess,
	}).Error)
	require.NoError(t, DB.Create(&TopUp{
		UserId:          3,
		Amount:          100,
		Money:           100,
		TradeNo:         "topup-leaderboard-failed",
		PaymentProvider: PaymentProviderStripe,
		Status:          common.TopUpStatusFailed,
	}).Error)
	require.NoError(t, DB.Create(&Redemption{
		Key:        "topup-leaderboard-unused",
		UsedUserId: 3,
		Quota:      9000000,
		Status:     common.RedemptionCodeStatusEnabled,
	}).Error)

	leaderboard, err := GetTopUpLeaderboard(10)
	require.NoError(t, err)
	require.Len(t, leaderboard, 2)

	assert.Equal(t, 1, leaderboard[0].Rank)
	assert.False(t, strings.Contains(leaderboard[0].DisplayName, "@"), "email-like usernames should be masked")
	assert.EqualValues(t, 1, leaderboard[0].RechargeCount)
	assert.EqualValues(t, 10000000, leaderboard[0].RechargeQuota)
	assert.EqualValues(t, 120, leaderboard[0].LatestRechargeTime)

	assert.Equal(t, 2, leaderboard[1].Rank)
	assert.EqualValues(t, 2, leaderboard[1].RechargeCount)
	assert.EqualValues(t, 6000000, leaderboard[1].RechargeQuota)
	assert.EqualValues(t, 110, leaderboard[1].LatestRechargeTime)
}
