package model

import (
	"fmt"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func insertAffLeaderboardUser(t *testing.T, user *User) {
	t.Helper()
	if user.Password == "" {
		user.Password = "password"
	}
	if user.Status == 0 {
		user.Status = common.UserStatusEnabled
	}
	if user.AffCode == "" {
		user.AffCode = fmt.Sprintf("aff%d", user.Id)
	}
	require.NoError(t, DB.Create(user).Error)
}

func TestGetAffLeaderboardRanksByInviteeRechargeAndRedemption(t *testing.T) {
	truncateTables(t)

	insertAffLeaderboardUser(t, &User{Id: 1, Username: "alice", DisplayName: "Alice Creator", AffHistoryQuota: 700000})
	insertAffLeaderboardUser(t, &User{Id: 2, Username: "bob@example.com", AffHistoryQuota: 300000})
	insertAffLeaderboardUser(t, &User{Id: 10, Username: "alice_invitee_paid", InviterId: 1})
	insertAffLeaderboardUser(t, &User{Id: 11, Username: "alice_invitee_free", InviterId: 1})
	insertAffLeaderboardUser(t, &User{Id: 12, Username: "bob_invitee", InviterId: 2})
	insertAffLeaderboardUser(t, &User{Id: 13, Username: "not_invited"})

	require.NoError(t, DB.Create(&TopUp{
		UserId:          10,
		Amount:          12,
		Money:           12,
		TradeNo:         "aff-leaderboard-paid",
		PaymentProvider: PaymentProviderStripe,
		Status:          common.TopUpStatusSuccess,
	}).Error)
	require.NoError(t, DB.Create(&TopUp{
		UserId:          11,
		Amount:          99,
		Money:           99,
		TradeNo:         "aff-leaderboard-failed",
		PaymentProvider: PaymentProviderWaffo,
		Status:          common.TopUpStatusFailed,
	}).Error)
	require.NoError(t, DB.Create(&TopUp{
		UserId:          13,
		Amount:          100,
		Money:           100,
		TradeNo:         "aff-leaderboard-uninvited",
		PaymentProvider: PaymentProviderStripe,
		Status:          common.TopUpStatusSuccess,
	}).Error)
	require.NoError(t, DB.Create(&Redemption{
		UsedUserId: 12,
		Quota:      10000000,
		Status:     common.RedemptionCodeStatusUsed,
	}).Error)

	leaderboard, err := GetAffLeaderboard(10)
	require.NoError(t, err)
	require.Len(t, leaderboard, 2)

	assert.Equal(t, 1, leaderboard[0].Rank)
	assert.False(t, strings.Contains(leaderboard[0].DisplayName, "@"), "email-like usernames should be masked")
	assert.EqualValues(t, 1, leaderboard[0].InviteCount)
	assert.EqualValues(t, 1, leaderboard[0].EffectiveInviteCount)
	assert.EqualValues(t, 10000000, leaderboard[0].RechargeQuota)
	assert.EqualValues(t, 300000, leaderboard[0].RebateQuota)

	assert.Equal(t, 2, leaderboard[1].Rank)
	assert.EqualValues(t, 2, leaderboard[1].InviteCount)
	assert.EqualValues(t, 1, leaderboard[1].EffectiveInviteCount)
	assert.EqualValues(t, 6000000, leaderboard[1].RechargeQuota)
	assert.EqualValues(t, 700000, leaderboard[1].RebateQuota)
}
