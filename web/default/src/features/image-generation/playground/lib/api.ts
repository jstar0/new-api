import { getActiveApiProfile, getCustomProviderDefinition } from './apiProfiles'
import { callFalAiImageApi } from './falAiImageApi'
import type { CallApiOptions, CallApiResult } from './imageApiShared'
import { callOpenAICompatibleImageApi } from './openaiCompatibleImageApi'

export type { CallApiOptions, CallApiResult } from './imageApiShared'
export { normalizeBaseUrl } from './devProxy'

export async function callImageApi(
  opts: CallApiOptions
): Promise<CallApiResult> {
  const profile = getActiveApiProfile(opts.settings)
  if (profile.provider === 'fal') return callFalAiImageApi(opts, profile)

  return callOpenAICompatibleImageApi(
    opts,
    profile,
    getCustomProviderDefinition(opts.settings, profile.provider)
  )
}
