// utils/web3.js
import Web3 from 'web3'

let web3 = null

export const getWeb3 = async () => {
  if (web3) return web3
  
  if (typeof window !== 'undefined' && window.ethereum) {
    web3 = new Web3(window.ethereum)
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' })
      return web3
    } catch (error) {
      console.error('User denied account access')
      return null
    }
  } else if (typeof window !== 'undefined' && window.web3) {
    web3 = new Web3(window.web3.currentProvider)
    return web3
  } else {
    console.log('No web3 provider detected. Please install MetaMask')
    return null
  }
}

export const getAccounts = async () => {
  const web3Instance = await getWeb3()
  if (!web3Instance) return []
  return await web3Instance.eth.getAccounts()
}

export const signMessage = async (message, account) => {
  const web3Instance = await getWeb3()
  if (!web3Instance) return null
  return await web3Instance.eth.personal.sign(message, account)
}