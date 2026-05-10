package model

import (
	"errors"
	"fmt"
	"strings"

	"github.com/QuantumNous/new-api/logger"
	"gorm.io/gorm"
)

const inviteRechargeRebateDivisor int64 = 20

func calcInviteRechargeRebateQuota(rechargeQuota int64) int64 {
	if rechargeQuota <= 0 {
		return 0
	}
	return rechargeQuota / inviteRechargeRebateDivisor
}

func GrantInviteRechargeRebate(inviteeId int, rechargeQuota int64) (int, int, error) {
	var inviterId int
	var rebateQuota int
	err := DB.Transaction(func(tx *gorm.DB) error {
		var err error
		inviterId, rebateQuota, err = GrantInviteRechargeRebateTx(tx, inviteeId, rechargeQuota)
		return err
	})
	return inviterId, rebateQuota, err
}

func GrantInviteRechargeRebateTx(tx *gorm.DB, inviteeId int, rechargeQuota int64) (int, int, error) {
	if tx == nil {
		return 0, 0, errors.New("db transaction is nil")
	}
	if inviteeId <= 0 || rechargeQuota <= 0 {
		return 0, 0, nil
	}

	var invitee User
	err := tx.Model(&User{}).
		Select("inviter_id").
		Where("id = ? AND deleted_at IS NULL", inviteeId).
		First(&invitee).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return 0, 0, nil
	}
	if err != nil {
		return 0, 0, err
	}
	if invitee.InviterId <= 0 || invitee.InviterId == inviteeId {
		return 0, 0, nil
	}

	rebateQuota := int(calcInviteRechargeRebateQuota(rechargeQuota))
	if rebateQuota <= 0 {
		return 0, 0, nil
	}

	result := tx.Model(&User{}).
		Where("id = ? AND deleted_at IS NULL", invitee.InviterId).
		Updates(map[string]interface{}{
			"aff_quota":   gorm.Expr("aff_quota + ?", rebateQuota),
			"aff_history": gorm.Expr("aff_history + ?", rebateQuota),
		})
	if result.Error != nil {
		return 0, 0, result.Error
	}
	if result.RowsAffected == 0 {
		return 0, 0, nil
	}

	return invitee.InviterId, rebateQuota, nil
}

func RecordInviteRechargeRebateLog(inviterId int, rebateQuota int, source string) {
	if inviterId <= 0 || rebateQuota <= 0 {
		return
	}
	source = strings.TrimSpace(source)
	if source == "" {
		source = "好友充值"
	}
	RecordLog(inviterId, LogTypeSystem, fmt.Sprintf("%s返利 %s", source, logger.LogQuota(rebateQuota)))
}
