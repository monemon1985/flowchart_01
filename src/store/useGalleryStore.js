import { create } from 'zustand'
import { supabase } from '../lib/supabaseClient'

const UNLOCK_KEY = 'gallery-unlocked'

export const useGalleryStore = create((set, get) => ({
  unlocked: localStorage.getItem(UNLOCK_KEY) === '1',
  flows: [],
  loading: false,
  error: '',

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
    await get().fetchFlows()
    return true
  },
}))
