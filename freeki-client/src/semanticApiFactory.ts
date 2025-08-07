// Semantic API Factory - Creates the appropriate semantic API implementation
// This is the one-line decision point between real and fake implementations

import type { ISemanticApi } from './semanticApiInterface'
import { RealSemanticApi } from './realSemanticApi'
import { FakeSemanticApi } from './fakeSemanticApi'

// Change this constant to switch between real and fake
const USE_FAKE_API = true

export function createSemanticApi(): ISemanticApi {
  if (USE_FAKE_API) {
    return new FakeSemanticApi()
  } else {
    return new RealSemanticApi()
  }
}