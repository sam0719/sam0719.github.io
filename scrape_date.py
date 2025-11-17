import json
import yfinance as yf
import pandas as pd
import os
from datetime import datetime, timedelta, date

def get_quarter(month):
    return (month - 1) // 3 + 1

def get_latest_month_end():
    today = datetime.today()
    first_day_this_month = today.replace(day=1)
    last_day_last_month = first_day_this_month - timedelta(days=1)
    return last_day_last_month.strftime("%Y-%m-%d")

def get_latest_month_start():
    today = date.today()
    first_day_this_month = today.replace(day=1)
    first_day_last_month = (first_day_this_month - timedelta(days=1)).replace(day=1)
    return first_day_last_month.strftime("%Y-%m-%d")

def format_filename(template, year, month):
    return template.format(year=year, month=f"{month:02d}", quarter=get_quarter(month))

with open("config.json") as f:
    config = json.load(f)

for market, info in config.items():
    symbols = info["stocks"]
    interval = info.get("interval", "1d")
    # start 處理
    start_raw = info.get("start")
    if start_raw == "auto_latest_month_start":
        start = pd.to_datetime(get_latest_month_start())
    else:
        start = pd.to_datetime(start_raw)

    # end 處理
    end_raw = info.get("end")
    if end_raw == "auto_latest_month_end":
        end = pd.to_datetime(get_latest_month_end())
    else:
        end = pd.to_datetime(end_raw)

    filename_template = info.get("filename_format", "data_{year}_{month}.csv")
    output_dir = f"data/{market}"
    os.makedirs(output_dir, exist_ok=True)

    print(f"📥 Downloading: {market} ({len(symbols)} symbols) from {start.date()} to {end.date()} ...")
    df = yf.download(symbols, start=start, end=end, interval=interval, progress=False)

    if df.empty:
        print(f"⚠️ No data found for market {market}")
        continue
    # 如果是多股票，df.columns 會是 MultiIndex
    if isinstance(df.columns, pd.MultiIndex):
        df = df["Close"]
    df = df.reset_index()
    df["Year"] = df["Date"].dt.year
    df["Month"] = df["Date"].dt.month

    for (y, m), group in df.groupby(["Year", "Month"]):
        filename = format_filename(filename_template, y, m)
        filepath = os.path.join(output_dir, filename)

        if os.path.exists(filepath):
            print(f"⏩ Skipping existing: {filepath}")
            continue
        price_matrix = group[["Date"] + symbols].reset_index(drop=True)
        price_matrix["Date"] = price_matrix["Date"].dt.strftime("%Y%m%d")
        price_matrix.to_csv(filepath, index=False)
        print(f"✅ Saved: {filepath}")
