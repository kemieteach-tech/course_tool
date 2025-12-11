import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from './firebase'

/**
 * 上傳圖片到 Firebase Storage
 * @param {File|Blob} file - 圖片檔案
 * @param {string} path - 儲存路徑 (例如: 'courses/course-id/image.jpg')
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export async function uploadImage(file, path) {
  try {
    const storageRef = ref(storage, path)
    const snapshot = await uploadBytes(storageRef, file)
    const url = await getDownloadURL(snapshot.ref)
    
    return {
      success: true,
      url: url
    }
  } catch (error) {
    console.error('圖片上傳失敗:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 從 base64 字串上傳圖片
 * @param {string} base64String - base64 圖片字串
 * @param {string} path - 儲存路徑
 * @param {string} contentType - 圖片類型 (例如: 'image/jpeg')
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export async function uploadImageFromBase64(base64String, path, contentType = 'image/jpeg') {
  try {
    // 移除 data URL 前綴 (如果有的話)
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '')
    
    // 將 base64 轉換為 Blob
    const byteCharacters = atob(base64Data)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: contentType })
    
    // 上傳
    return await uploadImage(blob, path)
  } catch (error) {
    console.error('Base64 圖片上傳失敗:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 從 URL 下載並上傳圖片
 * @param {string} imageUrl - 圖片 URL
 * @param {string} path - 儲存路徑
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export async function uploadImageFromUrl(imageUrl, path) {
  try {
    // 下載圖片
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error('圖片下載失敗')
    }
    
    const blob = await response.blob()
    
    // 上傳
    return await uploadImage(blob, path)
  } catch (error) {
    console.error('URL 圖片上傳失敗:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 刪除圖片
 * @param {string} path - 儲存路徑
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteImage(path) {
  try {
    const storageRef = ref(storage, path)
    await deleteObject(storageRef)
    
    return {
      success: true
    }
  } catch (error) {
    console.error('圖片刪除失敗:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 批次上傳圖片
 * @param {Array<{file: File|Blob|string, path: string, type?: string}>} images
 * @returns {Promise<Array<{success: boolean, url?: string, error?: string}>>}
 */
export async function uploadImagesInBatch(images) {
  const promises = images.map(async (img) => {
    if (typeof img.file === 'string') {
      // 如果是 base64 字串
      if (img.file.startsWith('data:image') || img.file.startsWith('iVBOR')) {
        return await uploadImageFromBase64(img.file, img.path, img.type)
      }
      // 如果是 URL
      else if (img.file.startsWith('http')) {
        return await uploadImageFromUrl(img.file, img.path)
      }
    }
    // 如果是 File 或 Blob
    return await uploadImage(img.file, img.path)
  })
  
  return await Promise.all(promises)
}

/**
 * 生成唯一的檔案路徑
 * @param {string} courseId - 課程 ID
 * @param {string} type - 圖片類型 (例如: 'infographic', 'thumbnail')
 * @param {number} index - 圖片索引
 * @returns {string}
 */
export function generateImagePath(courseId, type, index = 0) {
  const timestamp = Date.now()
  const filename = `${type}_${index}_${timestamp}.jpg`
  return `courses/${courseId}/${filename}`
}
