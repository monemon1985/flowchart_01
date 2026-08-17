import { create } from 'zustand'
import { supabase } from '../lib/supabaseClient'

const UNLOCK_KEY = 'gallery-unlocked'

export const useGalleryStore = create((set, get) => ({
  unlocked: localStorage.getItem(UNLOCK_KEY) === '1',
  flows: [],
  loading: false,
  error: '',
  // ギャラリーから開いた投稿のid/タイトル。上書き保存の対象を覚えておくためのもの。
  // 新しくテンプレートを読み込んだりJSONを読み込んだりすると useFlowStore 側からクリアされる。
  currentFlowId: null,
  currentFlowTitle: '',

  setCurrentFlow(id, title) {
    set({ currentFlowId: id, currentFlowTitle: title })
  },

  clearCurrentFlow() {
    set({ currentFlowId: null, currentFlowTitle: '' })
  },

  unlock(passphrase) {
    const ok = passphrase === import.meta.env.VITE_GALLERY_PASSPHRASE
    if (ok) {
      localStorage.setItem(UNLOCK_KEY, '1')
      set({ unlocked: true })
    }
    return ok
  },

  async fetchFlows() {
    set({ loading: true, error: '' })
    const { data, error } = await supabase
      .from('flows')
      .select('id,title,author,created_at,state')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) {
      set({ loading: false, error: error.message })
      return
    }
    set({ loading: false, flows: data })
  },

  async publish({ title, author, state }) {
    set({ error: '' })
    const { error } = await supabase.from('flows').insert({ title, author: author || null, state })
    if (error) {
      set({ error: error.message })
      return false
    }
    get().clearCurrentFlow()
    await get().fetchFlows()
    return true
  },

  async updateFlow(id, { state }) {
    set({ error: '' })
    const { error } = await supabase.from('flows').update({ state }).eq('id', id)
    if (error) {
      set({ error: error.message })
      return false
    }
    await get().fetchFlows()
    return true
  },

  async removeFlow(id) {
    set({ error: '' })
    const { error } = await supabase.from('flows').delete().eq('id', id)
    if (error) {
      set({ error: error.message })
      return false
    }
    if (get().currentFlowId === id) get().clearCurrentFlow()
    await get().fetchFlows()
    return true
  },
}))
