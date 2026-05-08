package setting

import (
	"fmt"
	"math"
	"sync"

	"github.com/QuantumNous/new-api/common"
)

var ModelRequestRateLimitEnabled = false
var ModelRequestRateLimitDurationMinutes = 1
var ModelRequestRateLimitCount = 0
var ModelRequestRateLimitSuccessCount = 1000
var ModelRequestRateLimitGroup = map[string][2]int{}
var ModelRequestRateLimitMutex sync.RWMutex
var UserRelayConcurrencyLimit = 5
var UserRelayConcurrencyLimitUser = map[int]int{}
var UserRelayConcurrencyLimitMutex sync.RWMutex

func ModelRequestRateLimitGroup2JSONString() string {
	ModelRequestRateLimitMutex.RLock()
	defer ModelRequestRateLimitMutex.RUnlock()

	jsonBytes, err := common.Marshal(ModelRequestRateLimitGroup)
	if err != nil {
		common.SysLog("error marshalling model ratio: " + err.Error())
	}
	return string(jsonBytes)
}

func UpdateModelRequestRateLimitGroupByJSONString(jsonStr string) error {
	ModelRequestRateLimitMutex.RLock()
	defer ModelRequestRateLimitMutex.RUnlock()

	ModelRequestRateLimitGroup = make(map[string][2]int)
	return common.UnmarshalJsonStr(jsonStr, &ModelRequestRateLimitGroup)
}

func GetGroupRateLimit(group string) (totalCount, successCount int, found bool) {
	ModelRequestRateLimitMutex.RLock()
	defer ModelRequestRateLimitMutex.RUnlock()

	if ModelRequestRateLimitGroup == nil {
		return 0, 0, false
	}

	limits, found := ModelRequestRateLimitGroup[group]
	if !found {
		return 0, 0, false
	}
	return limits[0], limits[1], true
}

func CheckModelRequestRateLimitGroup(jsonStr string) error {
	checkModelRequestRateLimitGroup := make(map[string][2]int)
	err := common.UnmarshalJsonStr(jsonStr, &checkModelRequestRateLimitGroup)
	if err != nil {
		return err
	}
	for group, limits := range checkModelRequestRateLimitGroup {
		if limits[0] < 0 || limits[1] < 1 {
			return fmt.Errorf("group %s has negative rate limit values: [%d, %d]", group, limits[0], limits[1])
		}
		if limits[0] > math.MaxInt32 || limits[1] > math.MaxInt32 {
			return fmt.Errorf("group %s [%d, %d] has max rate limits value 2147483647", group, limits[0], limits[1])
		}
	}

	return nil
}

func UserRelayConcurrencyLimitUser2JSONString() string {
	UserRelayConcurrencyLimitMutex.RLock()
	defer UserRelayConcurrencyLimitMutex.RUnlock()

	jsonBytes, err := common.Marshal(UserRelayConcurrencyLimitUser)
	if err != nil {
		common.SysLog("error marshalling user relay concurrency limits: " + err.Error())
	}
	return string(jsonBytes)
}

func UpdateUserRelayConcurrencyLimitUserByJSONString(jsonStr string) error {
	UserRelayConcurrencyLimitMutex.Lock()
	defer UserRelayConcurrencyLimitMutex.Unlock()

	limits := make(map[int]int)
	if jsonStr == "" {
		UserRelayConcurrencyLimitUser = limits
		return nil
	}
	if err := common.UnmarshalJsonStr(jsonStr, &limits); err != nil {
		return err
	}
	UserRelayConcurrencyLimitUser = limits
	return nil
}

func GetUserRelayConcurrencyLimit(userID int) int {
	UserRelayConcurrencyLimitMutex.RLock()
	defer UserRelayConcurrencyLimitMutex.RUnlock()

	if userLimit, found := UserRelayConcurrencyLimitUser[userID]; found {
		return userLimit
	}
	return UserRelayConcurrencyLimit
}

func CheckUserRelayConcurrencyLimitUser(jsonStr string) error {
	if jsonStr == "" {
		return nil
	}

	limits := make(map[int]int)
	if err := common.UnmarshalJsonStr(jsonStr, &limits); err != nil {
		return err
	}
	for userID, limit := range limits {
		if userID <= 0 {
			return fmt.Errorf("user id %d must be greater than 0", userID)
		}
		if limit < 0 {
			return fmt.Errorf("user %d has negative concurrency limit: %d", userID, limit)
		}
		if limit > math.MaxInt32 {
			return fmt.Errorf("user %d concurrency limit %d has max value 2147483647", userID, limit)
		}
	}
	return nil
}
