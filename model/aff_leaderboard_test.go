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

	insertAffLeaderboardUser(t, &User{Id: 1, Username: "alice", DisplayName: "Alice Creator", AffHistoryQuota: 99000000})
	insertAffLeaderboardUser(t, &User{Id: 2, Username: "bob@example.com", AffHistoryQuota: 1})
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
	assert.EqualValues(t, 500000, leaderboard[0].RebateQuota)

	assert.Equal(t, 2, leaderboard[1].Rank)
	assert.EqualValues(t, 2, leaderboard[1].InviteCount)
	assert.EqualValues(t, 1, leaderboard[1].EffectiveInviteCount)
	assert.EqualValues(t, 6000000, leaderboard[1].RechargeQuota)
	assert.EqualValues(t, 300000, leaderboard[1].RebateQuota)
}

func TestRedeemGrantsInviteRechargeRebate(t *testing.T) {
	truncateTables(t)

	insertAffLeaderboardUser(t, &User{Id: 1, Username: "inviter"})
	insertAffLeaderboardUser(t, &User{Id: 10, Username: "invitee", InviterId: 1})
	require.NoError(t, DB.Create(&Redemption{
		Key:    "redeem-invite-rebate",
		Status: common.RedemptionCodeStatusEnabled,
		Quota:  10000000,
	}).Error)

	quota, err := Redeem("redeem-invite-rebate", 10)
	require.NoError(t, err)
	assert.EqualValues(t, 10000000, quota)

	var invitee User
	require.NoError(t, DB.First(&invitee, 10).Error)
	assert.EqualValues(t, 10000000, invitee.Quota)

	var inviter User
	require.NoError(t, DB.First(&inviter, 1).Error)
	assert.EqualValues(t, 500000, inviter.AffQuota)
	assert.EqualValues(t, 500000, inviter.AffHistoryQuota)
}

func TestGrantInviteRechargeRebateSkipsUsersWithoutInviter(t *testing.T) {
	truncateTables(t)

	insertAffLeaderboardUser(t, &User{Id: 10, Username: "plain-user"})

	inviterId, rebateQuota, err := GrantInviteRechargeRebate(10, 10000000)
	require.NoError(t, err)
	assert.Zero(t, inviterId)
	assert.Zero(t, rebateQuota)

	var user User
	require.NoError(t, DB.First(&user, 10).Error)
	assert.Zero(t, user.AffQuota)
	assert.Zero(t, user.AffHistoryQuota)
}
