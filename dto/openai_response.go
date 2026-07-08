package dto

import (
	"bytes"
	"encoding/json"
	"fmt"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/types"
)

const (
	ResponsesOutputTypeToolSearchCall      = "tool_search_call"
	ResponsesOutputTypeWebSearchCall       = "web_search_call"
	ResponsesOutputTypeFileSearchCall      = "file_search_call"
	ResponsesOutputTypeLocalShellCall      = "local_shell_call"
	ResponsesOutputTypeComputerCall        = "computer_call"
	ResponsesOutputTypeImageGenerationCall = "image_generation_call"
	ResponsesOutputTypeCodeInterpreterCall = "code_interpreter_call"
	ResponsesOutputTypeMcpCall             = "mcp_call"
)

type SimpleResponse struct {
	Usage `json:"usage"`
	Error any `json:"error"`
}

// GetOpenAIError 从动态错误类型中提取OpenAIError结构
func (s *SimpleResponse) GetOpenAIError() *types.OpenAIError {
	return GetOpenAIError(s.Error)
}

type TextResponse struct {
	Id      string                     `json:"id"`
	Object  string                     `json:"object"`
	Created int64                      `json:"created"`
	Model   string                     `json:"model"`
	Choices []OpenAITextResponseChoice `json:"choices"`
	Usage   `json:"usage"`
}

type OpenAITextResponseChoice struct {
	Index        int `json:"index"`
	Message      `json:"message"`
	FinishReason string `json:"finish_reason"`
}

type OpenAITextResponse struct {
	Id      string                     `json:"id"`
	Model   string                     `json:"model"`
	Object  string                     `json:"object"`
	Created any                        `json:"created"`
	Choices []OpenAITextResponseChoice `json:"choices"`
	Error   any                        `json:"error,omitempty"`
	Usage   `json:"usage"`
}

// GetOpenAIError 从动态错误类型中提取OpenAIError结构
func (o *OpenAITextResponse) GetOpenAIError() *types.OpenAIError {
	return GetOpenAIError(o.Error)
}

type OpenAIEmbeddingResponseItem struct {
	Object    string    `json:"object"`
	Index     int       `json:"index"`
	Embedding []float64 `json:"embedding"`
}

type OpenAIEmbeddingResponse struct {
	Object string                        `json:"object"`
	Data   []OpenAIEmbeddingResponseItem `json:"data"`
	Model  string                        `json:"model"`
	Usage  `json:"usage"`
}

type FlexibleEmbeddingResponseItem struct {
	Object    string `json:"object"`
	Index     int    `json:"index"`
	Embedding any    `json:"embedding"`
}

type FlexibleEmbeddingResponse struct {
	Object string                          `json:"object"`
	Data   []FlexibleEmbeddingResponseItem `json:"data"`
	Model  string                          `json:"model"`
	Usage  `json:"usage"`
}

type ChatCompletionsStreamResponseChoice struct {
	Delta        ChatCompletionsStreamResponseChoiceDelta `json:"delta,omitempty"`
	Logprobs     *any                                     `json:"logprobs"`
	FinishReason *string                                  `json:"finish_reason"`
	Index        int                                      `json:"index"`
}

type ChatCompletionsStreamResponseChoiceDelta struct {
	Content          *string            `json:"content,omitempty"`
	ReasoningContent *string            `json:"reasoning_content,omitempty"`
	Reasoning        *string            `json:"reasoning,omitempty"`
	Role             string             `json:"role,omitempty"`
	ToolCalls        []ToolCallResponse `json:"tool_calls,omitempty"`
}

func (c *ChatCompletionsStreamResponseChoiceDelta) SetContentString(s string) {
	c.Content = &s
}

func (c *ChatCompletionsStreamResponseChoiceDelta) GetContentString() string {
	if c.Content == nil {
		return ""
	}
	return *c.Content
}

func (c *ChatCompletionsStreamResponseChoiceDelta) GetReasoningContent() string {
	if c.ReasoningContent == nil && c.Reasoning == nil {
		return ""
	}
	if c.ReasoningContent != nil {
		return *c.ReasoningContent
	}
	return *c.Reasoning
}

func (c *ChatCompletionsStreamResponseChoiceDelta) SetReasoningContent(s string) {
	c.ReasoningContent = &s
	//c.Reasoning = &s
}

type ToolCallResponse struct {
	// Index is not nil only in chat completion chunk object
	Index    *int             `json:"index,omitempty"`
	ID       string           `json:"id,omitempty"`
	Type     any              `json:"type"`
	Function FunctionResponse `json:"function"`
}

func (c *ToolCallResponse) SetIndex(i int) {
	c.Index = &i
}

type FunctionResponse struct {
	Description string `json:"description,omitempty"`
	Name        string `json:"name,omitempty"`
	// call function with arguments in JSON format
	Parameters any    `json:"parameters,omitempty"` // request
	Arguments  string `json:"arguments"`            // response
}

type ChatCompletionsStreamResponse struct {
	Id                string                                `json:"id"`
	Object            string                                `json:"object"`
	Created           int64                                 `json:"created"`
	Model             string                                `json:"model"`
	SystemFingerprint *string                               `json:"system_fingerprint"`
	Choices           []ChatCompletionsStreamResponseChoice `json:"choices"`
	Usage             *Usage                                `json:"usage"`
}

func (c *ChatCompletionsStreamResponse) IsFinished() bool {
	if len(c.Choices) == 0 {
		return false
	}
	return c.Choices[0].FinishReason != nil && *c.Choices[0].FinishReason != ""
}

func (c *ChatCompletionsStreamResponse) IsToolCall() bool {
	if len(c.Choices) == 0 {
		return false
	}
	return len(c.Choices[0].Delta.ToolCalls) > 0
}

func (c *ChatCompletionsStreamResponse) GetFirstToolCall() *ToolCallResponse {
	if c.IsToolCall() {
		return &c.Choices[0].Delta.ToolCalls[0]
	}
	return nil
}

func (c *ChatCompletionsStreamResponse) ClearToolCalls() {
	if !c.IsToolCall() {
		return
	}
	for choiceIdx := range c.Choices {
		for callIdx := range c.Choices[choiceIdx].Delta.ToolCalls {
			c.Choices[choiceIdx].Delta.ToolCalls[callIdx].ID = ""
			c.Choices[choiceIdx].Delta.ToolCalls[callIdx].Type = nil
			c.Choices[choiceIdx].Delta.ToolCalls[callIdx].Function.Name = ""
		}
	}
}

func (c *ChatCompletionsStreamResponse) Copy() *ChatCompletionsStreamResponse {
	choices := make([]ChatCompletionsStreamResponseChoice, len(c.Choices))
	copy(choices, c.Choices)
	return &ChatCompletionsStreamResponse{
		Id:                c.Id,
		Object:            c.Object,
		Created:           c.Created,
		Model:             c.Model,
		SystemFingerprint: c.SystemFingerprint,
		Choices:           choices,
		Usage:             c.Usage,
	}
}

func (c *ChatCompletionsStreamResponse) GetSystemFingerprint() string {
	if c.SystemFingerprint == nil {
		return ""
	}
	return *c.SystemFingerprint
}

func (c *ChatCompletionsStreamResponse) SetSystemFingerprint(s string) {
	c.SystemFingerprint = &s
}

type ChatCompletionsStreamResponseSimple struct {
	Choices []ChatCompletionsStreamResponseChoice `json:"choices"`
	Usage   *Usage                                `json:"usage"`
}

type CompletionsStreamResponse struct {
	Choices []struct {
		Text         string `json:"text"`
		FinishReason string `json:"finish_reason"`
	} `json:"choices"`
}

type Usage struct {
	PromptTokens         int    `json:"prompt_tokens"`
	CompletionTokens     int    `json:"completion_tokens"`
	TotalTokens          int    `json:"total_tokens"`
	PromptCacheHitTokens int    `json:"prompt_cache_hit_tokens,omitempty"`
	UsageSemantic        string `json:"usage_semantic,omitempty"`
	UsageSource          string `json:"usage_source,omitempty"`

	PromptTokensDetails    InputTokenDetails  `json:"prompt_tokens_details"`
	CompletionTokenDetails OutputTokenDetails `json:"completion_tokens_details"`
	InputTokens            int                `json:"input_tokens"`
	OutputTokens           int                `json:"output_tokens"`
	InputTokensDetails     *InputTokenDetails `json:"input_tokens_details"`

	// claude cache 1h
	ClaudeCacheCreation5mTokens int `json:"claude_cache_creation_5_m_tokens"`
	ClaudeCacheCreation1hTokens int `json:"claude_cache_creation_1_h_tokens"`

	// OpenRouter Params
	Cost any `json:"cost,omitempty"`
}

type OpenAIVideoResponse struct {
	Id        string `json:"id" example:"file-abc123"`
	Object    string `json:"object" example:"file"`
	Bytes     int64  `json:"bytes" example:"120000"`
	CreatedAt int64  `json:"created_at" example:"1677610602"`
	ExpiresAt int64  `json:"expires_at" example:"1677614202"`
	Filename  string `json:"filename" example:"mydata.jsonl"`
	Purpose   string `json:"purpose" example:"fine-tune"`
}

type InputTokenDetails struct {
	CachedTokens         int `json:"cached_tokens"`
	CachedCreationTokens int `json:"cached_creation_tokens,omitempty"`
	TextTokens           int `json:"text_tokens"`
	AudioTokens          int `json:"audio_tokens"`
	ImageTokens          int `json:"image_tokens"`
}

type OutputTokenDetails struct {
	TextTokens      int `json:"text_tokens"`
	AudioTokens     int `json:"audio_tokens"`
	ImageTokens     int `json:"image_tokens"`
	ReasoningTokens int `json:"reasoning_tokens"`
}

type OpenAIResponsesResponse struct {
	ID                 string             `json:"id"`
	Object             string             `json:"object"`
	CreatedAt          int                `json:"created_at"`
	Status             json.RawMessage    `json:"status"`
	Error              any                `json:"error,omitempty"`
	IncompleteDetails  *IncompleteDetails `json:"incomplete_details,omitempty"`
	Instructions       json.RawMessage    `json:"instructions"`
	MaxOutputTokens    int                `json:"max_output_tokens"`
	Model              string             `json:"model"`
	Output             []ResponsesOutput  `json:"output"`
	ParallelToolCalls  bool               `json:"parallel_tool_calls"`
	PreviousResponseID json.RawMessage    `json:"previous_response_id"`
	Reasoning          *Reasoning         `json:"reasoning"`
	Store              bool               `json:"store"`
	Temperature        float64            `json:"temperature"`
	ToolChoice         json.RawMessage    `json:"tool_choice"`
	Tools              []map[string]any   `json:"tools"`
	TopP               float64            `json:"top_p"`
	Truncation         json.RawMessage    `json:"truncation"`
	Usage              *Usage             `json:"usage"`
	User               json.RawMessage    `json:"user"`
	Metadata           json.RawMessage    `json:"metadata"`
}

// GetOpenAIError 从动态错误类型中提取OpenAIError结构
func (o *OpenAIResponsesResponse) GetOpenAIError() *types.OpenAIError {
	return GetOpenAIError(o.Error)
}

func (o *OpenAIResponsesResponse) HasImageGenerationCall() bool {
	if len(o.Output) == 0 {
		return false
	}
	for _, output := range o.Output {
		if output.Type == ResponsesOutputTypeImageGenerationCall {
			return true
		}
	}
	return false
}

func (o *OpenAIResponsesResponse) GetQuality() string {
	if len(o.Output) == 0 {
		return ""
	}
	for _, output := range o.Output {
		if output.Type == ResponsesOutputTypeImageGenerationCall {
			return output.Quality
		}
	}
	return ""
}

func (o *OpenAIResponsesResponse) GetSize() string {
	if len(o.Output) == 0 {
		return ""
	}
	for _, output := range o.Output {
		if output.Type == ResponsesOutputTypeImageGenerationCall {
			return output.Size
		}
	}
	return ""
}

type IncompleteDetails struct {
	Reason string `json:"reason"`
}

type ResponsesOutput struct {
	Type      string                   `json:"type"`
	ID        string                   `json:"id"`
	Status    string                   `json:"status"`
	Role      string                   `json:"role"`
	Content   []ResponsesOutputContent `json:"content"`
	Quality   string                   `json:"quality"`
	Size      string                   `json:"size"`
	CallId    string                   `json:"call_id,omitempty"`
	Name      string                   `json:"name,omitempty"`
	Arguments json.RawMessage          `json:"arguments,omitempty"`
}

// ArgumentsString returns function call arguments in the string form expected by Chat Completions.
func (r *ResponsesOutput) ArgumentsString() string {
	if r == nil {
		return ""
	}
	return ResponsesArgumentsString(r.Arguments)
}

// ResponsesArgumentsString returns function call arguments in the string form expected by Chat Completions.
func ResponsesArgumentsString(arguments json.RawMessage) string {
	return common.JsonRawMessageToString(arguments)
}

// ResponsesObjectArgumentItemTypes are Responses built-in tool call item types
// whose arguments are consumed as structured JSON by Codex clients.
var ResponsesObjectArgumentItemTypes = map[string]bool{
	ResponsesOutputTypeToolSearchCall:      true,
	ResponsesOutputTypeWebSearchCall:       true,
	ResponsesOutputTypeFileSearchCall:      true,
	ResponsesOutputTypeLocalShellCall:      true,
	ResponsesOutputTypeComputerCall:        true,
	ResponsesOutputTypeImageGenerationCall: true,
	ResponsesOutputTypeCodeInterpreterCall: true,
	ResponsesOutputTypeMcpCall:             true,
}

func IsResponsesObjectArgumentItemType(itemType string) bool {
	return ResponsesObjectArgumentItemTypes[itemType]
}

func NormalizeResponsesObjectArgumentsJSON(data []byte) ([]byte, bool) {
	var payload map[string]json.RawMessage
	if err := json.Unmarshal(data, &payload); err != nil {
		return data, false
	}
	if !normalizeResponsesPayloadArguments(payload) {
		return data, false
	}
	normalized, err := json.Marshal(payload)
	if err != nil {
		return data, false
	}
	return normalized, true
}

func normalizeResponsesPayloadArguments(payload map[string]json.RawMessage) bool {
	changed := false

	if itemRaw, ok := payload["item"]; ok {
		item, ok := unmarshalResponsesRawObject(itemRaw)
		if ok && normalizeResponsesOutputArguments(item) {
			if normalized, err := json.Marshal(item); err == nil {
				payload["item"] = normalized
				changed = true
			}
		}
	}

	if responseRaw, ok := payload["response"]; ok {
		response, ok := unmarshalResponsesRawObject(responseRaw)
		if ok && normalizeResponsesResponseOutputArguments(response) {
			if normalized, err := json.Marshal(response); err == nil {
				payload["response"] = normalized
				changed = true
			}
		}
	}

	if normalizeResponsesResponseOutputArguments(payload) {
		changed = true
	}

	return changed
}

func normalizeResponsesResponseOutputArguments(response map[string]json.RawMessage) bool {
	outputRaw, ok := response["output"]
	if !ok {
		return false
	}
	var outputs []map[string]json.RawMessage
	if err := json.Unmarshal(outputRaw, &outputs); err != nil {
		return false
	}
	changed := false
	for i := range outputs {
		if normalizeResponsesOutputArguments(outputs[i]) {
			changed = true
		}
	}
	if !changed {
		return false
	}
	normalized, err := json.Marshal(outputs)
	if err != nil {
		return false
	}
	response["output"] = normalized
	return true
}

func normalizeResponsesOutputArguments(item map[string]json.RawMessage) bool {
	itemType := rawJSONString(item["type"])
	if !IsResponsesObjectArgumentItemType(itemType) {
		return false
	}
	arguments, ok := item["arguments"]
	if !ok {
		return false
	}
	normalized, ok := normalizeStringifiedCompositeJSON(arguments)
	if !ok {
		return false
	}
	item["arguments"] = normalized
	return true
}

func normalizeStringifiedCompositeJSON(value json.RawMessage) (json.RawMessage, bool) {
	trimmed := bytes.TrimSpace(value)
	if len(trimmed) == 0 || trimmed[0] != '"' {
		return value, false
	}
	var decoded string
	if err := json.Unmarshal(trimmed, &decoded); err != nil {
		return value, false
	}
	inner := bytes.TrimSpace([]byte(decoded))
	if len(inner) == 0 || !json.Valid(inner) {
		return value, false
	}
	if inner[0] != '{' && inner[0] != '[' {
		return value, false
	}
	return json.RawMessage(append([]byte(nil), inner...)), true
}

func unmarshalResponsesRawObject(raw json.RawMessage) (map[string]json.RawMessage, bool) {
	var obj map[string]json.RawMessage
	if err := json.Unmarshal(raw, &obj); err != nil {
		return nil, false
	}
	return obj, true
}

func rawJSONString(raw json.RawMessage) string {
	var value string
	if err := json.Unmarshal(raw, &value); err != nil {
		return ""
	}
	return value
}

type ResponsesOutputContent struct {
	Type        string        `json:"type"`
	Text        string        `json:"text"`
	Annotations []interface{} `json:"annotations"`
}

type ResponsesReasoningSummaryPart struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

const (
	BuildInToolWebSearchPreview = "web_search_preview"
	BuildInToolFileSearch       = "file_search"
)

const (
	BuildInCallWebSearchCall = "web_search_call"
)

const (
	ResponsesOutputTypeItemAdded = "response.output_item.added"
	ResponsesOutputTypeItemDone  = "response.output_item.done"
)

// ResponsesStreamResponse 用于处理 /v1/responses 流式响应
type ResponsesStreamResponse struct {
	Type     string                   `json:"type"`
	Response *OpenAIResponsesResponse `json:"response,omitempty"`
	Delta    string                   `json:"delta,omitempty"`
	Item     *ResponsesOutput         `json:"item,omitempty"`
	// - response.function_call_arguments.delta
	// - response.function_call_arguments.done
	OutputIndex  *int                           `json:"output_index,omitempty"`
	ContentIndex *int                           `json:"content_index,omitempty"`
	SummaryIndex *int                           `json:"summary_index,omitempty"`
	ItemID       string                         `json:"item_id,omitempty"`
	Part         *ResponsesReasoningSummaryPart `json:"part,omitempty"`
}

// GetOpenAIError 从动态错误类型中提取OpenAIError结构
func GetOpenAIError(errorField any) *types.OpenAIError {
	if errorField == nil {
		return nil
	}

	switch err := errorField.(type) {
	case types.OpenAIError:
		return &err
	case *types.OpenAIError:
		return err
	case map[string]interface{}:
		// 处理从JSON解析来的map结构
		openaiErr := &types.OpenAIError{}
		if errType, ok := err["type"].(string); ok {
			openaiErr.Type = errType
		}
		if errMsg, ok := err["message"].(string); ok {
			openaiErr.Message = errMsg
		}
		if errParam, ok := err["param"].(string); ok {
			openaiErr.Param = errParam
		}
		if errCode, ok := err["code"]; ok {
			openaiErr.Code = errCode
		}
		return openaiErr
	case string:
		// 处理简单字符串错误
		return &types.OpenAIError{
			Type:    "error",
			Message: err,
		}
	default:
		// 未知类型，尝试转换为字符串
		return &types.OpenAIError{
			Type:    "unknown_error",
			Message: fmt.Sprintf("%v", err),
		}
	}
}
