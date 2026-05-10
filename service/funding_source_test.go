package service

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestWalletFundingConsumesRewardBeforeWalletAndRefundsSplit(t *testing.T) {
	truncate(t)

	require.NoError(t, model.DB.Create(&model.User{
		Id:          1,
		Username:    "reward_wallet_user",
		Password:    "password",
		Status:      common.UserStatusEnabled,
		Quota:       100,
		RewardQuota: 50,
	}).Error)

	funding := &WalletFunding{userId: 1}
	require.NoError(t, funding.PreConsume(70))

	var user model.User
	require.NoError(t, model.DB.First(&user, "id = ?", 1).Error)
	assert.Equal(t, 0, user.RewardQuota)
	assert.Equal(t, 80, user.Quota)
	assert.Equal(t, 50, funding.rewardConsumed)
	assert.Equal(t, 20, funding.walletConsumed)

	require.NoError(t, funding.Settle(-30))
	require.NoError(t, model.DB.First(&user, "id = ?", 1).Error)
	assert.Equal(t, 10, user.RewardQuota)
	assert.Equal(t, 100, user.Quota)
	assert.Equal(t, 40, funding.rewardConsumed)
	assert.Equal(t, 0, funding.walletConsumed)

	require.NoError(t, funding.Refund())
	require.NoError(t, model.DB.First(&user, "id = ?", 1).Error)
	assert.Equal(t, 50, user.RewardQuota)
	assert.Equal(t, 100, user.Quota)
	assert.Equal(t, 0, funding.rewardConsumed)
	assert.Equal(t, 0, funding.walletConsumed)
}
