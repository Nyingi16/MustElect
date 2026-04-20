// frontend/utils/tabSessionManager.js

// Check if we're in the browser
const isBrowser = typeof window !== 'undefined' && typeof sessionStorage !== 'undefined'

class TabSessionManager {
  constructor() {
    this.tabId = null
    this.listeners = []
    this.sessionId = null
    
    if (isBrowser) {
      this.tabId = this.getOrCreateTabId()
      this.sessionId = this.getOrCreateSessionId()
    }
  }

  getOrCreateTabId() {
    if (!isBrowser) return 'server'
    
    let tabId = sessionStorage.getItem('tabSessionId')
    if (!tabId) {
      tabId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
      sessionStorage.setItem('tabSessionId', tabId)
    }
    return tabId
  }

  getOrCreateSessionId() {
    if (!isBrowser) return 'server'
    
    let sessionId = sessionStorage.getItem('loginSessionId')
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
      sessionStorage.setItem('loginSessionId', sessionId)
    }
    return sessionId
  }

  getTabId() {
    return this.tabId || 'server'
  }

  getSessionId() {
    return this.sessionId || 'server'
  }

  getSessionKey(key) {
    if (!isBrowser || !this.sessionId) return key
    return `${key}_${this.sessionId}`
  }

  setItem(key, value) {
    if (!isBrowser) return
    sessionStorage.setItem(this.getSessionKey(key), value)
  }

  getItem(key) {
    if (!isBrowser) return null
    return sessionStorage.getItem(this.getSessionKey(key))
  }

  removeItem(key) {
    if (!isBrowser) return
    sessionStorage.removeItem(this.getSessionKey(key))
  }

  clearSession() {
    if (!isBrowser) return
    
    const keysToRemove = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key && this.sessionId && key.endsWith(this.sessionId)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => sessionStorage.removeItem(key))
    
    // Generate new session ID for next login
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
    sessionStorage.setItem('loginSessionId', this.sessionId)
  }

  clearAllTabData() {
    if (!isBrowser) return
    
    // Clear all data for this tab
    const keysToRemove = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key && this.tabId && key.includes(this.tabId)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => sessionStorage.removeItem(key))
  }

  broadcast(message, data) {
    if (!isBrowser) return
    
    const broadcastData = {
      message,
      data,
      sourceTab: this.tabId,
      sourceSession: this.sessionId,
      timestamp: Date.now()
    }
    localStorage.setItem('tab_broadcast', JSON.stringify(broadcastData))
    setTimeout(() => localStorage.removeItem('tab_broadcast'), 100)
  }

  onMessage(callback) {
    if (!isBrowser) return () => {}
    
    this.listeners.push(callback)
    
    const storageListener = (event) => {
      if (event.key === 'tab_broadcast' && event.newValue) {
        try {
          const { message, data, sourceTab, sourceSession } = JSON.parse(event.newValue)
          if (sourceTab !== this.tabId) {
            this.listeners.forEach(listener => listener(message, data, sourceTab, sourceSession))
          }
        } catch (e) {
          console.error('Failed to parse broadcast message', e)
        }
      }
    }
    
    window.addEventListener('storage', storageListener)
    
    return () => {
      const index = this.listeners.indexOf(callback)
      if (index > -1) this.listeners.splice(index, 1)
      window.removeEventListener('storage', storageListener)
    }
  }

  notifyLogout() {
    if (!isBrowser) return
    this.broadcast('LOGOUT', { tabId: this.tabId, sessionId: this.sessionId, timestamp: Date.now() })
    this.clearSession()
  }

  notifyLogin(userData) {
    if (!isBrowser) return
    this.broadcast('LOGIN', { user: userData, tabId: this.tabId, sessionId: this.sessionId, timestamp: Date.now() })
  }

  getActiveTabCount() {
    if (!isBrowser) return 1
    
    const tabIds = new Set()
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key && key.includes('_tab_')) {
        const match = key.match(/tab_[^_]+/)
        if (match) tabIds.add(match[0])
      }
    }
    return tabIds.size
  }
}

// Export as singleton
const tabSessionManager = new TabSessionManager()
export default tabSessionManager