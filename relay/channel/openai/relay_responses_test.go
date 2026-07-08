package openai

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/types"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func newResponsesRelayTestContext(t *testing.T, body string, contentType string) (*gin.Context, *httptest.ResponseRecorder, *http.Response, *relaycommon.RelayInfo) {
	t.Helper()

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/responses", nil)
	c.Set(common.RequestIdKey, "responses-relay-test")

	resp := &http.Response{
		StatusCode: http.StatusOK,
		Body:       io.NopCloser(strings.NewReader(body)),
		Header:     http.Header{"Content-Type": []string{contentType}},
	}
	info := &relaycommon.RelayInfo{
		ChannelMeta: &relaycommon.ChannelMeta{UpstreamModelName: "gpt-test"},
		RelayFormat: types.RelayFormatOpenAI,
		DisablePing: true,
	}
	return c, recorder, resp, info
}

func TestOaiResponsesHandlerNormalizesObjectToolCallArguments(t *testing.T) {
	oldMode := gin.Mode()
	gin.SetMode(gin.TestMode)
	t.Cleanup(func() { gin.SetMode(oldMode) })

	body := `{"id":"resp_1","object":"response","created_at":1710000000,"status":"completed","model":"gpt-test","output":[{"type":"tool_search_call","id":"tsc_1","call_id":"call_1","status":"completed","arguments":"{\"query\":\"duojie-image\",\"limit\":20}"},{"type":"function_call","id":"fc_1","call_id":"call_2","name":"lookup","arguments":"{\"q\":\"x\"}"}],"usage":{"input_tokens":1,"output_tokens":2,"total_tokens":3}}`
	c, recorder, resp, info := newResponsesRelayTestContext(t, body, "application/json")

	usage, err := OaiResponsesHandler(c, info, resp)
	require.Nil(t, err)
	require.NotNil(t, usage)
	require.Equal(t, 3, usage.TotalTokens)

	got := recorder.Body.String()
	require.Contains(t, got, `"type":"tool_search_call"`)
	require.Contains(t, got, `"arguments":{"query":"duojie-image","limit":20}`)
	require.Contains(t, got, `"type":"function_call"`)
	require.Contains(t, got, `"arguments":"{\"q\":\"x\"}"`)
	require.NotContains(t, got, `"arguments":"{\"query\":\"duojie-image\"`)
}

func TestOaiResponsesStreamHandlerNormalizesObjectToolCallArguments(t *testing.T) {
	oldMode := gin.Mode()
	gin.SetMode(gin.TestMode)
	t.Cleanup(func() { gin.SetMode(oldMode) })

	oldTimeout := constant.StreamingTimeout
	constant.StreamingTimeout = 30
	t.Cleanup(func() { constant.StreamingTimeout = oldTimeout })

	body := strings.Join([]string{
		`data: {"type":"response.output_item.done","item":{"type":"tool_search_call","id":"tsc_1","call_id":"call_1","status":"completed","arguments":"{\"query\":\"duojie-image\",\"limit\":20}"}}`,
		`data: {"type":"response.output_item.done","item":{"type":"function_call","id":"fc_1","call_id":"call_2","name":"lookup","arguments":"{\"q\":\"x\"}"}}`,
		`data: {"type":"response.completed","response":{"status":"completed","usage":{"input_tokens":1,"output_tokens":2,"total_tokens":3}}}`,
		`data: [DONE]`,
		``,
	}, "\n")
	c, recorder, resp, info := newResponsesRelayTestContext(t, body, "text/event-stream")

	usage, err := OaiResponsesStreamHandler(c, info, resp)
	require.Nil(t, err)
	require.NotNil(t, usage)
	require.Equal(t, 3, usage.TotalTokens)

	got := recorder.Body.String()
	require.Contains(t, got, `event: response.output_item.done`)
	require.Contains(t, got, `"type":"tool_search_call"`)
	require.Contains(t, got, `"arguments":{"query":"duojie-image","limit":20}`)
	require.Contains(t, got, `"type":"function_call"`)
	require.Contains(t, got, `"arguments":"{\"q\":\"x\"}"`)
	require.NotContains(t, got, `"arguments":"{\"query\":\"duojie-image\"`)
}
