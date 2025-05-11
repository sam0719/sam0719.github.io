document.addEventListener("DOMContentLoaded", () => {
  // 元素引用
  const initialMoneyInput = document.getElementById("initialMoney")
  const uploadFileInput = document.getElementById("uploadFile")
  const stockListContainer = document.getElementById("stockList")
  const calculateBtn = document.getElementById("calculateBtn")
  const resetBtn = document.getElementById("resetBtn")
  const resultCard = document.getElementById("resultCard")
  const trendRatioElement = document.getElementById("trendRatio")
  const returnValueElement = document.getElementById("returnValue")
  const riskValueElement = document.getElementById("riskValue")

  // 全局變量
  let stockData = []
  let stockPriceData = {
    stockPrices: [],
    rowCount: 0,
  }

  // 目錄和文件瀏覽相關元素
  const categorySelect = document.getElementById("categorySelect")
  const refreshCategoriesBtn = document.getElementById("refreshCategoriesBtn")
  const filesList = document.getElementById("filesList")

  // 存儲目錄和文件數據
  let categories = []
  const files = {}
  let selectedFiles = []

  // 為GitHub Pages準備的靜態數據結構
  // 這個索引文件應該放在倉庫的根目錄下
  const INDEX_FILE = "data/index.json"

  // 添加錯誤處理和加載狀態管理
  function showLoading(element, message = "載入中...") {
    element.innerHTML = `<div class="loading">${message}</div>`
  }

  function showError(element, message) {
    element.innerHTML = `<div class="error-message">${message}</div>`
  }

  // 初始化目錄和文件數據
  async function initializeFileBrowser() {
    try {
      showLoading(filesList, "初始化中...")
      await loadCategories()
    } catch (error) {
      console.error("初始化文件瀏覽器失敗:", error)
      showError(filesList, "初始化文件瀏覽器失敗，請刷新頁面重試")
    }
  }

  // 載入分類目錄
  function loadCategories() {
    try {
      // 使用 XMLHttpRequest 替代 fetch 以避免本地文件 CORS 問題
      const xhr = new XMLHttpRequest()

      // 同步請求，僅用於本地文件
      xhr.open("GET", INDEX_FILE, false)

      // 嘗試發送請求
      try {
        xhr.send()
      } catch (e) {
        // 如果是本地文件系統錯誤，提供更友好的錯誤信息
        console.error("獲取JSON時出錯:", e)
        categorySelect.innerHTML = '<option value="">無法載入分類</option>'
        filesList.innerHTML = `
          <div class="error-message">
            <p>無法載入索引文件。這可能是由於瀏覽器安全限制導致的。</p>
            <p>請嘗試以下解決方案：</p>
            <ol>
              <li>使用本地開發服務器運行此應用</li>
              <li>或使用 Chrome 瀏覽器並添加 --allow-file-access-from-files 參數啟動</li>
            </ol>
          </div>`
        return
      }

      // 處理響應
      if (xhr.status === 200) {
        const indexData = JSON.parse(xhr.responseText)
        categories = Object.keys(indexData)

        // 同時載入文件列表
        for (const category in indexData) {
          files[category] = indexData[category]
        }

        if (categories.length === 0) {
          categorySelect.innerHTML = '<option value="">沒有可用的分類</option>'
          filesList.innerHTML = '<div class="no-files">沒有可用的分類</div>'
        } else {
          updateCategorySelect()
        }
      } else {
        console.error("無法載入索引文件:", xhr.status)
        categorySelect.innerHTML = '<option value="">沒有可用的分類</option>'
        filesList.innerHTML = '<div class="no-files">無法載入索引文件</div>'
      }
    } catch (error) {
      console.error("載入分類目錄失敗:", error)
      categorySelect.innerHTML = '<option value="">沒有可用的分類</option>'
      filesList.innerHTML = '<div class="no-files">載入分類失敗</div>'
    }
  }

  // 更新分類選擇下拉框
  function updateCategorySelect() {
    categorySelect.innerHTML = '<option value="">請選擇分類</option>'

    categories.forEach((category) => {
      const option = document.createElement("option")
      option.value = category
      option.textContent = category
      categorySelect.appendChild(option)
    })
  }

  // 當選擇分類時載入該分類下的文件
  categorySelect.addEventListener("change", async () => {
    const selectedCategory = categorySelect.value

    if (!selectedCategory) {
      filesList.innerHTML = '<div class="no-files">請先選擇分類</div>'
      return
    }

    try {
      // 由於我們已經在loadCategories中載入了所有文件列表，
      // 這裡只需要更新UI
      updateFilesList(selectedCategory)
    } catch (error) {
      console.error(`載入 ${selectedCategory} 分類下的文件失敗:`, error)
      filesList.innerHTML = `<div class="no-files">${selectedCategory} 分類下沒有文件</div>`
    }
  })

  // 更新文件列表
  function updateFilesList(category) {
    const categoryFiles = files[category] || []

    if (categoryFiles.length === 0) {
      filesList.innerHTML = `<div class="no-files">${category} 分類下沒有文件</div>`
      return
    }

    filesList.innerHTML = ""

    categoryFiles.forEach((file) => {
      const fileItem = document.createElement("div")
      fileItem.className = `file-item ${selectedFiles.includes(file) ? "selected" : ""}`
      fileItem.dataset.file = file
      fileItem.dataset.category = category

      fileItem.innerHTML = `
        <input type="checkbox" class="file-item-checkbox" ${selectedFiles.includes(file) ? "checked" : ""}>
        <span>${file}</span>
      `

      fileItem.addEventListener("click", () => toggleFileSelection(file, category, fileItem))

      filesList.appendChild(fileItem)
    })
  }

  // 切換文件選擇狀態
  async function toggleFileSelection(file, category, fileItem) {
    const checkbox = fileItem.querySelector(".file-item-checkbox")
    const isSelected = selectedFiles.includes(file)
    const originalContent = fileItem.innerHTML // 声明 originalContent 变量

    if (isSelected) {
      // 取消選擇
      selectedFiles = selectedFiles.filter((f) => f !== file)
      fileItem.classList.remove("selected")
      checkbox.checked = false
    } else {
      // 選擇文件
      try {
        // 顯示加載狀態
        fileItem.innerHTML = `<div class="loading">載入中...</div>`

        // 載入文件內容
        await loadFileContent(file, category)

        // 更新選擇狀態
        selectedFiles.push(file)
        fileItem.classList.add("selected")
        fileItem.innerHTML = originalContent
        fileItem.querySelector(".file-item-checkbox").checked = true
      } catch (error) {
        console.error(`載入文件 ${file} 失敗:`, error)
        alert(`載入文件 ${file} 失敗: ${error.message}`)

        // 恢復原始內容
        fileItem.innerHTML = originalContent
      }
    }
  }

  // 載入文件內容
  function loadFileContent(file, category) {
    return new Promise((resolve, reject) => {
      try {
        // 使用 XMLHttpRequest 替代 fetch
        const xhr = new XMLHttpRequest()
        xhr.open("GET", `data/${category}/${file}`, true)

        xhr.onload = () => {
          if (xhr.status === 200) {
            // 獲取文件內容
            const csvText = xhr.responseText

            // 處理CSV數據
            processCSVData(csvText)
            resolve()
          } else {
            reject(new Error(`HTTP error! status: ${xhr.status}`))
          }
        }

        xhr.onerror = () => {
          reject(new Error("網絡錯誤"))
        }

        xhr.send()
      } catch (error) {
        console.error(`載入文件 ${file} 內容失敗:`, error)
        reject(error)
      }
    })
  }

  // 刷新分類按鈕
  refreshCategoriesBtn.addEventListener("click", async () => {
    try {
      categorySelect.innerHTML = '<option value="">載入中...</option>'
      filesList.innerHTML = '<div class="loading">載入中...</div>'
      await loadCategories()
      if (categories.length === 0) {
        filesList.innerHTML = '<div class="no-files">沒有可用的分類</div>'
      } else {
        filesList.innerHTML = '<div class="no-files">請先選擇分類</div>'
      }
    } catch (error) {
      console.error("刷新分類失敗:", error)
      categorySelect.innerHTML = '<option value="">沒有可用的分類</option>'
      filesList.innerHTML = '<div class="no-files">沒有可用的分類</div>'
    }
  })

  // 初始化文件瀏覽器
  initializeFileBrowser()

  // 處理用戶上傳的CSV文件
  uploadFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      processCSVData(event.target.result)
    }
    reader.onerror = () => {
      alert("讀取文件失敗")
    }
    reader.readAsText(file)
  })

  // 處理CSV數據
  function processCSVData(csvText) {
    const lines = csvText.split("\n")
    if (lines.length < 2) {
      alert("CSV文件格式不正確")
      return
    }

    // 解析標題行
    const headers = lines[0].split(",").map((header) => header.trim())

    // 初始化股票數據
    stockData = headers.map((header) => ({
      name: header,
      percentage: 0,
      included: true,
    }))

    // 解析股價數據
    stockPriceData = {
      stockPrices: Array(headers.length)
        .fill()
        .map(() => []),
      rowCount: lines.length - 1,
    }

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue

      const values = lines[i].split(",")
      for (let j = 0; j < headers.length && j < values.length; j++) {
        const price = Number.parseFloat(values[j].trim())
        if (!isNaN(price)) {
          stockPriceData.stockPrices[j].push(price)
        }
      }
    }

    // 更新UI
    renderStockList()
  }

  // 渲染股票列表
  function renderStockList() {
    if (stockData.length === 0) {
      stockListContainer.innerHTML = '<div class="no-stocks">尚未載入股票數據，請載入預設股票或上傳股價檔</div>'
      return
    }

    stockListContainer.innerHTML = ""

    stockData.forEach((stock, index) => {
      const stockItem = document.createElement("div")
      stockItem.className = `stock-item ${stock.included ? "" : "excluded"}`

      stockItem.innerHTML = `
                <div class="stock-checkbox">
                    <input type="checkbox" id="checkbox-${index}" ${stock.included ? "checked" : ""}>
                </div>
                <div class="stock-name">${stock.name}</div>
                <div class="stock-percentage-container">
                    <input type="number" id="percentage-${index}" value="${stock.percentage}" min="0" max="100" step="1" ${!stock.included ? "disabled" : ""}>
                    <span>%</span>
                </div>
            `

      stockListContainer.appendChild(stockItem)

      // 添加事件監聽器
      document.getElementById(`checkbox-${index}`).addEventListener("change", (e) => {
        toggleStockInclusion(index, e.target.checked)
      })

      document.getElementById(`percentage-${index}`).addEventListener("change", (e) => {
        updateStockPercentage(index, Number.parseInt(e.target.value))
      })
    })
  }

  // 切換股票包含狀態
  function toggleStockInclusion(index, included) {
    stockData[index].included = included

    if (!stockData[index].included) {
      stockData[index].percentage = 0
    }

    renderStockList()
  }

  // 更新股票百分比
  function updateStockPercentage(index, value) {
    // 確保值是整數
    value = Math.floor(value)
    stockData[index].percentage = isNaN(value) ? 0 : value
  }

  // 計算趨勢比率
  calculateBtn.addEventListener("click", () => {
    const initialMoney = Number.parseFloat(initialMoneyInput.value)

    if (isNaN(initialMoney) || initialMoney <= 0) {
      alert("請輸入有效的初始資金")
      return
    }

    // 檢查是否有股票被選中
    const includedStocks = stockData.filter((stock) => stock.included)
    if (includedStocks.length === 0) {
      alert("請至少選擇一支股票")
      return
    }

    // 檢查百分比總和是否為100%
    const totalPercentage = stockData.reduce((sum, stock) => sum + (stock.included ? stock.percentage : 0), 0)
    if (Math.abs(totalPercentage - 100) > 0.01) {
      alert("所有股票的投資百分比總和必須為100%")
      return
    }

    // 計算趨勢比率
    const result = calculateTrendRatio(initialMoney)

    // 顯示結果
    trendRatioElement.textContent = result.trendRatio.toFixed(4)
    returnValueElement.textContent = result.returns.toFixed(4)
    riskValueElement.textContent = result.risk.toFixed(4)
    resultCard.style.display = "block"
  })

  // 計算趨勢比率的函數
  function calculateTrendRatio(initialMoney) {
    // 準備股票比率數據
    const stockRatios = []
    for (const stock of stockData) {
      if (stock.included) {
        stockRatios.push(stock.percentage)
      } else {
        stockRatios.push(0)
      }
    }

    // 將百分比轉換為小數
    const decimalRates = stockRatios.map((ratio) => ratio / 100)

    // 分配資金
    const shareMoney = []
    let remainMoney = initialMoney

    for (let i = 0; i < decimalRates.length; i++) {
      shareMoney[i] = Math.floor(initialMoney * decimalRates[i])
      remainMoney -= shareMoney[i]
    }

    // 計算每個股票可購買的股數和剩餘資金
    const eachStockCanBuy = []
    const eachStockRemainMoney = []

    // 計算每天的組合價值
    const FS = []
    const stockPrices = stockPriceData.stockPrices
    const rowCount = stockPriceData.rowCount

    for (let i = 0; i < rowCount; i++) {
      let money = 0

      for (let j = 0; j < decimalRates.length; j++) {
        // 確保有股票價格數據
        if (stockPrices[j] && stockPrices[j].length > 0) {
          // 第一天購買股票
          if (i === 0) {
            eachStockCanBuy[j] = Math.floor(shareMoney[j] / stockPrices[j][0])
            eachStockRemainMoney[j] = shareMoney[j] - eachStockCanBuy[j] * stockPrices[j][0]
          }

          // 計算當天的股票價值
          const stockIndex = Math.min(i, stockPrices[j].length - 1) // 確保不超出範圍
          money += eachStockCanBuy[j] * stockPrices[j][stockIndex] + eachStockRemainMoney[j]
        }
      }

      // 加上剩餘資金
      money += remainMoney
      FS[i] = money
    }

    // 計算報酬
    let returnNumerator = 0
    let returnDenominator = 0

    for (let i = 0; i < rowCount; i++) {
      returnNumerator += FS[i] * (i + 1) - (i + 1) * initialMoney
      returnDenominator += Math.pow(i + 1, 2)
    }

    const returns = returnNumerator / returnDenominator

    // 計算風險
    let risk = 0
    for (let i = 0; i < rowCount; i++) {
      risk += Math.pow(FS[i] - (returns * (i + 1) + initialMoney), 2.0)
    }

    risk = risk / rowCount
    risk = Math.sqrt(risk)

    // 計算TrendRatio
    const trendRatio = returns / risk

    return {
      trendRatio,
      returns,
      risk,
    }
  }

  // 重置按鈕
  resetBtn.addEventListener("click", () => {
    initialMoneyInput.value = 10000
    stockData = stockData.map((stock) => ({
      ...stock,
      percentage: 0,
      included: true,
    }))
    renderStockList()
    resultCard.style.display = "none"
  })

  // 批量操作按鈕
  const selectAllBtn = document.getElementById("selectAllBtn")
  const deselectAllBtn = document.getElementById("deselectAllBtn")
  const resetPercentagesBtn = document.getElementById("resetPercentagesBtn")
  const distributeEvenlyBtn = document.getElementById("distributeEvenlyBtn")

  // 全選按鈕
  selectAllBtn.addEventListener("click", () => {
    stockData = stockData.map((stock) => ({
      ...stock,
      included: true,
    }))
    renderStockList()
  })

  // 全不選按鈕
  deselectAllBtn.addEventListener("click", () => {
    stockData = stockData.map((stock) => ({
      ...stock,
      included: false,
      percentage: 0,
    }))
    renderStockList()
  })

  // 重置百分比按鈕
  resetPercentagesBtn.addEventListener("click", () => {
    stockData = stockData.map((stock) => ({
      ...stock,
      percentage: 0,
    }))
    renderStockList()
  })

  // 平均分配按鈕
  distributeEvenlyBtn.addEventListener("click", () => {
    const includedStocks = stockData.filter((stock) => stock.included)
    if (includedStocks.length === 0) {
      alert("請至少選擇一支股票")
      return
    }

    // 計算基本百分比（向下取整）
    const basePercentage = Math.floor(100 / includedStocks.length)

    // 計算剩餘的百分比
    const remainingPercentage = 100 - basePercentage * includedStocks.length

    // 先將所有選中的股票設置為基本百分比
    stockData = stockData.map((stock) => ({
      ...stock,
      percentage: stock.included ? basePercentage : 0,
    }))

    // 將剩餘的百分比分配到前面幾個選中的股票（每個加1%）
    let remainingCount = remainingPercentage
    let index = 0

    while (remainingCount > 0 && index < stockData.length) {
      if (stockData[index].included) {
        stockData[index].percentage += 1
        remainingCount--
      }
      index++
    }

    renderStockList()
  })
})
