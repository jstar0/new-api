package middleware

import (
	"fmt"
	"net/http"
	"sync"

	"github.com/QuantumNous/new-api/setting"
	"github.com/gin-gonic/gin"
)

var userRelayConcurrency = struct {
	sync.Mutex
	counts map[int]int
}{
	counts: make(map[int]int),
}

func acquireUserRelaySlot(userID int, limit int) bool {
	if userID <= 0 || limit <= 0 {
		return true
	}
	userRelayConcurrency.Lock()
	defer userRelayConcurrency.Unlock()
	if userRelayConcurrency.counts[userID] >= limit {
		return false
	}
	userRelayConcurrency.counts[userID]++
	return true
}

func releaseUserRelaySlot(userID int) {
	if userID <= 0 {
		return
	}
	userRelayConcurrency.Lock()
	defer userRelayConcurrency.Unlock()
	current := userRelayConcurrency.counts[userID]
	if current <= 1 {
		delete(userRelayConcurrency.counts, userID)
		return
	}
	userRelayConcurrency.counts[userID] = current - 1
}

func UserRelayConcurrencyLimit() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetInt("id")
		limit := setting.GetUserRelayConcurrencyLimit(userID)
		if !acquireUserRelaySlot(userID, limit) {
			abortWithOpenAiMessage(c, http.StatusTooManyRequests, fmt.Sprintf("用户并发请求数已达到上限：%d", limit))
			return
		}
		defer releaseUserRelaySlot(userID)
		c.Next()
	}
}
