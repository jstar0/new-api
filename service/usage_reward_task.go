package service

import (
	"fmt"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
)

var usageRewardSettlementOnce sync.Once

func StartUsageRewardSettlementTask() {
	usageRewardSettlementOnce.Do(func() {
		go func() {
			runUsageRewardSettlement()
			ticker := time.NewTicker(time.Minute)
			defer ticker.Stop()
			for range ticker.C {
				runUsageRewardSettlement()
			}
		}()
	})
}

func runUsageRewardSettlement() {
	granted, err := model.SettleDailyUsageRewards(time.Now())
	if err != nil {
		common.SysError("settle usage rewards error: " + err.Error())
		return
	}
	if granted > 0 {
		common.SysLog(fmt.Sprintf("settled usage rewards: %d users", granted))
	}
}
