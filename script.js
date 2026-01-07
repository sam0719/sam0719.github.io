document.addEventListener("DOMContentLoaded", () => {
  // 元素引用
  const initialMoneyInput = document.getElementById("initialMoney")
  const uploadFileInput = document.getElementById("uploadFile")
  const uploadStatusElement = document.getElementById("uploadStatus")
  const stockListContainer = document.getElementById("stockList")
  const calculateBtn = document.getElementById("calculateBtn")
  const resetBtn = document.getElementById("resetBtn")
  const resultCard = document.getElementById("resultCard")
  const trendRatioElement = document.getElementById("trendRatio")
  const returnValueElement = document.getElementById("returnValue")
  const riskValueElement = document.getElementById("riskValue")
  const allWeightsInput = document.getElementById("allWeights")
  const allWeightsContainer = document.getElementById("allWeightsContainer")

  // 全局變量
  let stockData = []
  let stockPriceData = {
    stockPrices: [],
    rowCount: 0,
  }

  // 目錄和文件瀏覽相關元素
  const categorySelect = document.getElementById("categorySelect")
  const fileSelect = document.getElementById("fileSelect")
  const refreshCategoriesBtn = document.getElementById("refreshCategoriesBtn")
  
  // 為所有股票權重輸入框添加事件監聽器
  allWeightsInput.addEventListener("change", updateFromAllWeights)

  // 存儲目錄和文件數據
  let categories = []
  const files = {}
  let selectedFile = ""
  let selectedCategory = ""

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

  function setUploadStatus(type, message) {
    if (!uploadStatusElement) return
    uploadStatusElement.className = "status-message"
    if (type) {
      uploadStatusElement.classList.add(type)
    }
    uploadStatusElement.textContent = message || ""
  }

  // 初始化目錄和文件數據
  async function initializeFileBrowser() {
    try {
      showLoading(fileSelect, "初始化中...")
      await loadCategories()
    } catch (error) {
      console.error("初始化文件瀏覽器失敗:", error)
      showError(fileSelect, "初始化文件瀏覽器失敗，請刷新頁面重試")
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
        fileSelect.innerHTML = `
          <option value="">無法載入文件</option>
        `
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
          fileSelect.innerHTML = '<option value="">沒有可用的文件</option>'
        } else {
          updateCategorySelect()
        }
      } else {
        console.error("無法載入索引文件:", xhr.status)
        categorySelect.innerHTML = '<option value="">沒有可用的分類</option>'
        fileSelect.innerHTML = '<option value="">無法載入文件</option>'
      }
    } catch (error) {
      console.error("載入分類目錄失敗:", error)
      categorySelect.innerHTML = '<option value="">沒有可用的分類</option>'
      fileSelect.innerHTML = '<option value="">載入分類失敗</option>'
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
    selectedCategory = categorySelect.value

    if (!selectedCategory) {
      fileSelect.innerHTML = '<option value="">請先選擇分類</option>'
      fileSelect.disabled = true
      return
    }

    try {
      // 由於我們已經在loadCategories中載入了所有文件列表，
      // 這裡只需要更新UI
      updateFileSelect(selectedCategory)
      fileSelect.disabled = false
    } catch (error) {
      console.error(`載入 ${selectedCategory} 分類下的文件失敗:`, error)
      fileSelect.innerHTML = `<option value="">${selectedCategory} 分類下沒有文件</option>`
      fileSelect.disabled = true
    }
  })

  // 更新文件下拉選單
  function updateFileSelect(category) {
    const categoryFiles = files[category] || []

    if (categoryFiles.length === 0) {
      fileSelect.innerHTML = `<option value="">${category} 分類下沒有文件</option>`
      fileSelect.disabled = true
      return
    }

    fileSelect.innerHTML = '<option value="">請選擇文件</option>'

    categoryFiles.forEach((file) => {
      const option = document.createElement("option")
      option.value = file
      option.textContent = file
      fileSelect.appendChild(option)
    })
  }

  // 當選擇文件時自動載入該文件
  fileSelect.addEventListener("change", async () => {
    selectedFile = fileSelect.value

    if (!selectedFile || !selectedCategory) {
      return
    }

    try {
      // 顯示加載狀態
      stockListContainer.innerHTML = '<div class="loading">載入文件中...</div>'

      // 載入文件內容
      await loadFileContent(selectedFile, selectedCategory)

      // 更新UI
      renderStockList()
    } catch (error) {
      console.error(`載入文件 ${selectedFile} 失敗:`, error)
      stockListContainer.innerHTML = `<div class="error-message">載入文件失敗: ${error.message}</div>`
    }
  })

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
      fileSelect.innerHTML = '<option value="">請先選擇分類</option>'
      fileSelect.disabled = true
      await loadCategories()
    } catch (error) {
      console.error("刷新分類失敗:", error)
      categorySelect.innerHTML = '<option value="">沒有可用的分類</option>'
      fileSelect.innerHTML = '<option value="">沒有可用的文件</option>'
    }
  })

  // 初始化文件瀏覽器
  initializeFileBrowser()

  // 處理用戶上傳的CSV文件
  uploadFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploadStatus("loading", "讀取中...")
    const reader = new FileReader()
    reader.onload = (event) => {
      const ok = processCSVData(event.target.result)
      if (ok) {
        setUploadStatus("success", `已成功載入 ${file.name}`)
      } else {
        setUploadStatus("error", `載入 ${file.name} 失敗：CSV 格式不正確或沒有有效數據`)
      }

      uploadFileInput.value = ""
    }
    reader.onerror = () => {
      alert("讀取文件失敗")
      setUploadStatus("error", "讀取文件失敗")
      uploadFileInput.value = ""
    }
    reader.readAsText(file)
  })

  // 處理CSV數據
  function processCSVData(csvText) {
    const lines = csvText.split("\n")
    if (lines.length < 2) {
      alert("CSV文件格式不正確")
      return false
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
    return true
  }

  // 渲染股票列表
  function renderStockList() {
    if (stockData.length === 0) {
      stockListContainer.innerHTML = '<div class="no-stocks">尚未載入股票數據，請載入預設股票或上傳股價檔</div>'
      allWeightsContainer.style.display = "none"
      return
    }

    // 顯示所有股票權重輸入框
    allWeightsContainer.style.display = "block"
    
    // 更新所有股票權重輸入框的值
    updateAllWeightsDisplay()

    stockListContainer.innerHTML = ""

    // 檢查平均分配開關是否開啟
    const isEvenlyDistributeEnabled = distributeEvenlyToggle.checked

    stockData.forEach((stock, index) => {
      const stockItem = document.createElement("div")
      stockItem.className = `stock-item ${stock.included ? "" : "excluded"}`

      // 根據平均分配開關狀態顯示不同的輸入方式
      let inputHtml = ''
      if (isEvenlyDistributeEnabled) {
        // 平均分配模式：選擇按鈕
        const value = stock.percentage > 0 ? 1 : 0
        const buttonClass = value === 1 ? "select-btn selected" : "select-btn"
        inputHtml = `
          <div class="stock-percentage-container">
            <input type="hidden" id="percentage-${index}" value="${value}">
            <button type="button" id="select-btn-${index}" class="${buttonClass}">
              ${value === 1 ? '已選擇' : '未選擇'}
            </button>
          </div>
        `
      } else {
        // 正常模式：輸入百分比
        inputHtml = `
          <div class="stock-percentage-container">
            <input type="number" id="percentage-${index}" value="${stock.percentage}" min="0" max="100" step="1" ${!stock.included ? "disabled" : ""}>
            <span>%</span>
          </div>
        `
      }

      stockItem.innerHTML = `
                <div class="stock-name">${stock.name}</div>
                ${inputHtml}
            `

      stockListContainer.appendChild(stockItem)

      // 添加事件監聽器
      if (isEvenlyDistributeEnabled) {
        // 平均分配模式：為選擇按鈕添加點擊事件
        const selectBtn = document.getElementById(`select-btn-${index}`)
        if (selectBtn) {
          selectBtn.addEventListener("click", () => {
            // 切換選擇狀態
            const currentValue = Number.parseInt(document.getElementById(`percentage-${index}`).value)
            const newValue = currentValue === 1 ? 0 : 1
            
            // 更新輸入框值和按鈕樣式
            document.getElementById(`percentage-${index}`).value = newValue
            selectBtn.classList.toggle("selected", newValue === 1)
            selectBtn.textContent = newValue === 1 ? '已選擇' : '未選擇'
            
            // 更新股票數據
            updateStockPercentage(index, newValue)
            stockData[index].included = newValue === 1
            renderStockItem(index)
          })
        }
      } else {
        // 正常模式：為百分比輸入框添加變更事件
        document.getElementById(`percentage-${index}`).addEventListener("change", (e) => {
          const value = Number.parseInt(e.target.value)
          updateStockPercentage(index, value)
          
          // 如果百分比為0，則設置為不包含，否則設置為包含
          stockData[index].included = value > 0
          renderStockItem(index)
        })
      }
    })
  }

  // 更新單個股票項目的顯示
  function renderStockItem(index) {
    const stockItem = document.querySelector(`.stock-item:nth-child(${index + 1})`)
    if (stockItem) {
      stockItem.classList.toggle("excluded", !stockData[index].included)
      const percentageInput = document.getElementById(`percentage-${index}`)
      if (percentageInput) {
        percentageInput.disabled = !stockData[index].included
      }
    }
    
    // 更新所有股票權重輸入框
    updateAllWeightsDisplay()
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
    
    // 更新所有股票權重輸入框
    updateAllWeightsDisplay()
  }
  
  // 更新所有股票權重輸入框的顯示
  function updateAllWeightsDisplay() {
    if (stockData.length === 0) return
    
    // 將所有股票的百分比轉換為空格分隔的字符串
    const weightsString = stockData.map(stock => stock.percentage).join(' ')
    allWeightsInput.value = weightsString
  }
  
  // 從所有股票權重輸入框更新個別股票權重
  function updateFromAllWeights() {
    const weightsString = allWeightsInput.value.trim()
    const weights = weightsString.split(/\s+/).map(w => parseInt(w, 10))
    
    // 確保權重數量與股票數量相符
    if (weights.length !== stockData.length) {
      alert(`請輸入 ${stockData.length} 個數字，用空格分隔`)
      updateAllWeightsDisplay() // 重置為原始值
      return
    }
    
    // 更新每個股票的權重
    weights.forEach((weight, index) => {
      if (isNaN(weight)) {
        weight = 0
      }
      
      // 如果權重大於 0，確保股票被包含
      if (weight > 0 && !stockData[index].included) {
        stockData[index].included = true
      }
      
      stockData[index].percentage = weight
    })
    
    // 重新渲染股票列表
    renderStockList()
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
    
    // 檢查是否開啟平均分配模式
    let result
    if (distributeEvenlyToggle.checked) {
      // 使用平均分配算法
      const selectedStocks = stockData.filter((stock) => stock.included && stock.percentage === 1)
      if (selectedStocks.length === 0) {
        alert("平均分配模式下，請至少將一支股票設為1")
        return
      }
      result = calculateEvenDistribution()
    } else {
      // 使用正常算法
      // 檢查百分比總和是否為100%
      const totalPercentage = stockData.reduce((sum, stock) => sum + (stock.included ? stock.percentage : 0), 0)
      if (totalPercentage - 100 > 0.01) {
        alert("所有股票的投資百分比總和必須小於等於100%")
        return
      }
      result = calculateTrendRatio(initialMoney)
    }
    // 顯示結果
    trendRatioElement.textContent = result.trendRatio.toFixed(30)
    returnValueElement.textContent = result.returns.toFixed(30)
    riskValueElement.textContent = result.risk.toFixed(30)
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
    const rowCount = stockPriceData.rowCount - 1

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
    initialMoneyInput.value = 10000000
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
  const distributeEvenlyToggle = document.getElementById("distributeEvenlyToggle")

  // 全選按鈕 - 將所有股票設為包含並設置默認百分比
  selectAllBtn.addEventListener("click", () => {
    // 計算默認百分比（平均分配）
    const defaultPercentage = Math.floor(100 / stockData.length)
    
    stockData = stockData.map((stock) => ({
      ...stock,
      included: true,
      percentage: defaultPercentage,
    }))
    
    // 分配剩餘百分比
    let remainingPercentage = 100 - defaultPercentage * stockData.length
    let index = 0
    
    while (remainingPercentage > 0 && index < stockData.length) {
      stockData[index].percentage += 1
      remainingPercentage--
      index++
    }
    
    renderStockList()
  })

  // 全不選按鈕 - 將所有股票的百分比設為0
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

  // 平均分配開關事件監聽器
  distributeEvenlyToggle.addEventListener("change", () => {
    // 重新渲染股票列表，以更新輸入模式
    renderStockList()
    
    // 如果開關被打開，將現有的百分比轉換為0或1
    if (distributeEvenlyToggle.checked) {
      stockData = stockData.map((stock) => ({
        ...stock,
        percentage: stock.percentage > 0 ? 1 : 0,
      }))
      
      // 在這裡計算平均分配
      const result = calculateEvenDistribution()
      
      // 如果有返回結果，則更新股票數據
      if (result && result.stockData) {
        stockData = result.stockData
      }
    }
    
    // 更新UI
    renderStockList()
  })
  
  // 平均分配計算函數 - 參考calculateTrendRatio的寫法返回calculateEvenDistribution
  function calculateEvenDistribution() {
    // 獲取選中的股票（值為1的股票）
    const selectedStocks = stockData.filter((stock) => stock.included && stock.percentage === 1)
    if (selectedStocks.length === 0) {
      return null
    }
    
    // 實現平均分配計算公式，參考用戶提供的C++代碼
    const initialMoney = Number.parseFloat(initialMoneyInput.value)
    const rowCount = stockPriceData.rowCount-1
    
    // 初始化每個股票可買的數量和每一天的資金狀況
    const eachStockCanBuy = Array(stockData.length).fill(0)
    const FS = Array(rowCount).fill(0)
    
    // 計算選中的股票數量
    const selectStockNum = selectedStocks.length
    
    // 每個股票分配的資金
    const shareMoney = Math.floor(initialMoney / selectStockNum)
    // 剩餘的資金
    const remainMoney = initialMoney - shareMoney * selectStockNum
    
    // 將選中的股票分配百分比
    let updatedStockData = stockData.map((stock) => ({
      ...stock,
      percentage: (stock.included && stock.percentage === 1) ? Math.floor(100 / selectStockNum) : 0,
    }))
    
    // 分配剩餘的百分比
    let remainingPercentage = 100 - Math.floor(100 / selectStockNum) * selectStockNum
    let index = 0
    
    while (remainingPercentage > 0 && index < updatedStockData.length) {
      if (updatedStockData[index].included && updatedStockData[index].percentage > 0) {
        updatedStockData[index].percentage += 1
        remainingPercentage--
      }
      index++
    }
    // 模擬每一天的投資情況
    for (let i = 0; i < rowCount; i++) {
      let money = 0
      
      for (let j = 0; j < stockData.length; j++) {
        if (stockData[j].included && stockData[j].percentage === 1) {
          // 獲取股票價格
          const stockPrices = stockPriceData.stockPrices[j] || []
          
          if (i === 0) { // 第一天
            // 計算可買的股票數量
            eachStockCanBuy[j] = Math.floor(shareMoney / stockPrices[0])
            
            // 計算資金（股票價值 + 剩餘的現金）
            money += eachStockCanBuy[j] * stockPrices[0] + (shareMoney - eachStockCanBuy[j] * stockPrices[0])
          } else {
            // 後續天數的資金計算
            money += eachStockCanBuy[j] * stockPrices[i] + (shareMoney - eachStockCanBuy[j] * stockPrices[0])
          }
        } else {
          eachStockCanBuy[j] = 0
        }
      }
      
      // 加上剩餘的資金
      money += remainMoney
      FS[i] = money
    }
    
    // 計算回報
    let returnNumerator = 0
    let returnDenominator = 0
    
    for (let i = 0; i < rowCount; i++) {
      returnNumerator += (FS[i] * (i + 1) - (i + 1) * initialMoney)
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
    
    // 返回結果對象，包含更新後的股票數據和計算結果
    return {
      stockData: updatedStockData,
      returns: returns,
      risk: risk,
      trendRatio: returns / risk
    }
  }
})
