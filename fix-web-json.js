// 修復網頁下拉選單的腳本

document.addEventListener("DOMContentLoaded", async () => {
  console.log("修復腳本已載入")

  // 獲取元素引用
  const categorySelect = document.getElementById("categorySelect")
  const filesList = document.getElementById("filesList")

  if (!categorySelect) {
    console.error("找不到下拉選單元素")
    return
  }

  // 清除現有內容
  categorySelect.innerHTML = '<option value="">載入中...</option>'

  // 嘗試載入JSON文件
  try {
    const response = await fetch("data/index.json")

    if (!response.ok) {
      throw new Error(`HTTP錯誤: ${response.status}`)
    }

    const data = await response.json()
    const categories = Object.keys(data)

    console.log("成功載入JSON數據:", data)
    console.log("找到的分類:", categories)

    // 更新下拉選單
    categorySelect.innerHTML = '<option value="">請選擇分類</option>'

    categories.forEach((category) => {
      const option = document.createElement("option")
      option.value = category
      option.textContent = category
      categorySelect.appendChild(option)
    })

    console.log("成功更新下拉選單，現在有", categorySelect.options.length, "個選項")

    // 添加事件監聽器
    categorySelect.addEventListener("change", function () {
      const selectedCategory = this.value

      if (!selectedCategory) {
        filesList.innerHTML = '<div class="no-files">請先選擇分類</div>'
        return
      }

      const files = data[selectedCategory] || []

      if (files.length === 0) {
        filesList.innerHTML = `<div class="no-files">${selectedCategory} 分類下沒有文件</div>`
        return
      }

      filesList.innerHTML = ""

      files.forEach((file) => {
        const fileItem = document.createElement("div")
        fileItem.className = "file-item"
        fileItem.dataset.file = file
        fileItem.dataset.category = selectedCategory

        fileItem.innerHTML = `
          <input type="checkbox" class="file-item-checkbox">
          <span>${file}</span>
        `

        filesList.appendChild(fileItem)
      })
    })
  } catch (error) {
    console.error("載入或解析JSON時出錯:", error)
    categorySelect.innerHTML = '<option value="">載入失敗</option>'
    filesList.innerHTML = '<div class="error-message">載入分類失敗: ' + error.message + "</div>"
  }
})
