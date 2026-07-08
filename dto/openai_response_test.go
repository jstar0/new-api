package dto

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestNormalizeResponsesObjectArgumentsJSON(t *testing.T) {
	input := []byte(`{"type":"response.output_item.done","item":{"type":"tool_search_call","arguments":"{\"query\":\"duojie-image\",\"limit\":20}"},"response":{"output":[{"type":"mcp_call","arguments":"{\"server\":\"duojie-image\"}"},{"type":"function_call","arguments":"{\"q\":\"x\"}"}]}}`)

	got, ok := NormalizeResponsesObjectArgumentsJSON(input)
	require.True(t, ok)
	require.JSONEq(t, `{"type":"response.output_item.done","item":{"type":"tool_search_call","arguments":{"query":"duojie-image","limit":20}},"response":{"output":[{"type":"mcp_call","arguments":{"server":"duojie-image"}},{"type":"function_call","arguments":"{\"q\":\"x\"}"}]}}`, string(got))
}

func TestNormalizeResponsesObjectArgumentsJSONLeavesExistingObjectsAndFunctionCalls(t *testing.T) {
	input := []byte(`{"type":"response.output_item.done","item":{"type":"tool_search_call","arguments":{"query":"duojie-image","limit":20}},"response":{"output":[{"type":"function_call","arguments":"{\"q\":\"x\"}"}]}}`)

	got, ok := NormalizeResponsesObjectArgumentsJSON(input)
	require.False(t, ok)
	require.Equal(t, string(input), string(got))
}

func TestNormalizeResponsesObjectArgumentsJSONIgnoresMalformedStringArguments(t *testing.T) {
	input := []byte(`{"item":{"type":"tool_search_call","arguments":"not json"}}`)

	got, ok := NormalizeResponsesObjectArgumentsJSON(input)
	require.False(t, ok)
	require.Equal(t, string(input), string(got))
}
