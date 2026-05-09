package model

import (
	"fmt"
	"strings"

	"github.com/QuantumNous/new-api/common"
)

type AffLeaderboardItem struct {
	Rank                 int    `json:"rank"`
	DisplayName          string `json:"display_name"`
	InviteCount          int64  `json:"invite_count"`
	EffectiveInviteCount int64  `json:"effective_invite_count"`
	RechargeQuota        int64  `json:"recharge_quota"`
	RebateQuota          int64  `json:"rebate_quota"`
}

type affLeaderboardRow struct {
	UserId               int
	DisplayName          string
	InviteCount          int64
	EffectiveInviteCount int64
	RechargeQuota        int64
	RebateQuota          int64
}

func GetAffLeaderboard(limit int) ([]AffLeaderboardItem, error) {
	if limit <= 0 || limit > 50 {
		limit = 10
	}

	rows := make([]affLeaderboardRow, 0, limit)
	err := DB.Raw(`
WITH recharge_events AS (
	SELECT
		user_id AS invitee_id,
		CAST(
			CASE
				WHEN payment_provider = ? THEN COALESCE(amount, 0)
				WHEN payment_provider = ? THEN COALESCE(money, 0) * ?
				ELSE COALESCE(amount, 0) * ?
			END AS BIGINT
		) AS recharge_quota
	FROM top_ups
	WHERE user_id > 0
		AND lower(COALESCE(status, '')) IN ('success', 'paid', 'completed', 'complete', 'succeeded', 'finished')
	UNION ALL
	SELECT
		used_user_id AS invitee_id,
		CAST(COALESCE(quota, 0) AS BIGINT) AS recharge_quota
	FROM redemptions
	WHERE used_user_id > 0
		AND status = ?
), invitee_recharge AS (
	SELECT invitee_id, SUM(recharge_quota) AS recharge_quota
	FROM recharge_events
	WHERE recharge_quota > 0
	GROUP BY invitee_id
)
SELECT
	inviter.id AS user_id,
	COALESCE(NULLIF(inviter.display_name, ''), inviter.username) AS display_name,
	COUNT(invitee.id) AS invite_count,
	COALESCE(SUM(CASE WHEN COALESCE(invitee_recharge.recharge_quota, 0) > 0 THEN 1 ELSE 0 END), 0) AS effective_invite_count,
	COALESCE(SUM(invitee_recharge.recharge_quota), 0) AS recharge_quota,
	COALESCE(inviter.aff_history, 0) AS rebate_quota
FROM users inviter
JOIN users invitee ON invitee.inviter_id = inviter.id AND invitee.deleted_at IS NULL
LEFT JOIN invitee_recharge ON invitee_recharge.invitee_id = invitee.id
WHERE inviter.deleted_at IS NULL
GROUP BY inviter.id, inviter.display_name, inviter.username, inviter.aff_history
HAVING COUNT(invitee.id) > 0
ORDER BY recharge_quota DESC, effective_invite_count DESC, invite_count DESC, inviter.id ASC
LIMIT ?`,
		PaymentProviderCreem,
		PaymentProviderStripe,
		common.QuotaPerUnit,
		common.QuotaPerUnit,
		common.RedemptionCodeStatusUsed,
		limit,
	).Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	items := make([]AffLeaderboardItem, 0, len(rows))
	for i, row := range rows {
		items = append(items, AffLeaderboardItem{
			Rank:                 i + 1,
			DisplayName:          maskAffLeaderboardName(row.DisplayName, row.UserId),
			InviteCount:          row.InviteCount,
			EffectiveInviteCount: row.EffectiveInviteCount,
			RechargeQuota:        row.RechargeQuota,
			RebateQuota:          row.RebateQuota,
		})
	}
	return items, nil
}

func maskAffLeaderboardName(name string, userId int) string {
	name = strings.TrimSpace(name)
	if name == "" {
		return fmt.Sprintf("用户%d", userId)
	}
	if strings.Contains(name, "@") {
		name = strings.NewReplacer("@", "", ".", "", "_", "", "-", "").Replace(name)
	}

	runes := []rune(name)
	switch len(runes) {
	case 0:
		return fmt.Sprintf("用户%d", userId)
	case 1:
		return string(runes[0]) + "*"
	case 2:
		return string(runes[0]) + "*"
	default:
		maskLen := len(runes) - 2
		if maskLen > 3 {
			maskLen = 3
		}
		return string(runes[0]) + strings.Repeat("*", maskLen) + string(runes[len(runes)-1])
	}
}
