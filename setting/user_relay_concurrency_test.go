package setting

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestUserRelayConcurrencyLimitUserJSONRoundTrip(t *testing.T) {
	require.NoError(t, UpdateUserRelayConcurrencyLimitUserByJSONString(`{"113":2,"82":10,"99":0}`))
	t.Cleanup(func() {
		require.NoError(t, UpdateUserRelayConcurrencyLimitUserByJSONString(`{}`))
		UserRelayConcurrencyLimit = 5
	})

	UserRelayConcurrencyLimit = 7

	require.Equal(t, 2, GetUserRelayConcurrencyLimit(113))
	require.Equal(t, 10, GetUserRelayConcurrencyLimit(82))
	require.Equal(t, 0, GetUserRelayConcurrencyLimit(99))
	require.Equal(t, 7, GetUserRelayConcurrencyLimit(44))
	require.JSONEq(t, `{"113":2,"82":10,"99":0}`, UserRelayConcurrencyLimitUser2JSONString())
}

func TestCheckUserRelayConcurrencyLimitUserRejectsInvalidJSON(t *testing.T) {
	require.NoError(t, CheckUserRelayConcurrencyLimitUser(`{"113":2,"99":0}`))
	require.Error(t, CheckUserRelayConcurrencyLimitUser(`{"0":2}`))
	require.Error(t, CheckUserRelayConcurrencyLimitUser(`{"113":-1}`))
	require.Error(t, CheckUserRelayConcurrencyLimitUser(`{"113":2147483648}`))
	require.Error(t, CheckUserRelayConcurrencyLimitUser(`not-json`))
}
