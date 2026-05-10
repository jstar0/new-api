package model

import "github.com/QuantumNous/new-api/common"

type TopUpLeaderboardItem struct {
	Rank               int    `json:"rank"`
	DisplayName        string `json:"display_name"`
	RechargeCount      int64  `json:"recharge_count"`
	RechargeQuota      int64  `json:"recharge_quota"`
	LatestRechargeTime int64  `json:"latest_recharge_time"`
}

type topUpLeaderboardRow struct {
	UserId             int
	DisplayName        string
	RechargeCount      int64
	RechargeQuota      int64
	LatestRechargeTime int64
}

func GetTopUpLeaderboard(limit int) ([]TopUpLeaderboardItem, error) {
	if limit <= 0 || limit > 50 {
		limit = 10
	}

	rows := make([]topUpLeaderboardRow, 0, limit)
	err := DB.Raw(`
WITH recharge_events AS (
	SELECT
		user_id,
		CAST(
			CASE
				WHEN payment_provider = ? THEN COALESCE(amount, 0)
				WHEN payment_provider = ? THEN COALESCE(money, 0) * ?
				ELSE COALESCE(amount, 0) * ?
			END AS BIGINT
		) AS recharge_quota,
		CAST(COALESCE(NULLIF(complete_time, 0), create_time, 0) AS BIGINT) AS recharge_time
	FROM top_ups
	WHERE user_id > 0
		AND lower(COALESCE(status, '')) IN ('success', 'paid', 'completed', 'complete', 'succeeded', 'finished')
	UNION ALL
	SELECT
		used_user_id AS user_id,
		CAST(COALESCE(quota, 0) AS BIGINT) AS recharge_quota,
		CAST(COALESCE(NULLIF(redeemed_time, 0), created_time, 0) AS BIGINT) AS recharge_time
	FROM redemptions
	WHERE used_user_id > 0
		AND status = ?
), user_recharge AS (
	SELECT
		user_id,
		COUNT(*) AS recharge_count,
		SUM(recharge_quota) AS recharge_quota,
		MAX(recharge_time) AS latest_recharge_time
	FROM recharge_events
	WHERE recharge_quota > 0
	GROUP BY user_id
)
SELECT
	users.id AS user_id,
	COALESCE(NULLIF(users.display_name, ''), users.username) AS display_name,
	user_recharge.recharge_count,
	user_recharge.recharge_quota,
	COALESCE(user_recharge.latest_recharge_time, 0) AS latest_recharge_time
FROM user_recharge
JOIN users ON users.id = user_recharge.user_id AND users.deleted_at IS NULL
ORDER BY user_recharge.recharge_quota DESC, user_recharge.recharge_count DESC, user_recharge.latest_recharge_time DESC, users.id ASC
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

	items := make([]TopUpLeaderboardItem, 0, len(rows))
	for i, row := range rows {
		items = append(items, TopUpLeaderboardItem{
			Rank:               i + 1,
			DisplayName:        maskAffLeaderboardName(row.DisplayName, row.UserId),
			RechargeCount:      row.RechargeCount,
			RechargeQuota:      row.RechargeQuota,
			LatestRechargeTime: row.LatestRechargeTime,
		})
	}
	return items, nil
}
