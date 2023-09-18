"use strict";
const StockModel = require("../models").Stock;
const fetch = require("node-fetch");

async function createStock(stock, like, ip) {
  const newStock = new StockModel({
    symbol: stock,
    likes: like ? [ip] : [],
  });
  const savedNew = await newStock.save();
  return savedNew;
}

async function findStock(stock) {
  return await StockModel.findOne({ symbol: stock }).exec();
}

async function saveStock(stock, like, ip) {
  let saved = {};
  const foundStock = await findStock(stock);
  if (!foundStock) {
    const createsaved = await createStock(stock, like, ip);
    saved = createsaved;
    return saved;
  } else {
    if (like && foundStock.likes.indexOf(ip) === -1) {
      foundStock.likes.push(ip);
    }
    saved = await foundStock.save();
    return saved;
  }
}

async function getStock(stock) {
  const response = await fetch(
    `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${stock}/quote`
  );
  const { symbol, latestPrice } = await response.json();
  return { symbol, latestPrice };
}

module.exports = function (app) {
  //https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/TSLA/quote

  app.route("/api/stock-prices").get(async function (req, res) {
    const { stock, like } = req.query;
    if (Array.isArray(stock)) {
      console.log("stocks", stock);

      const { symbol, latestPrice } = await getStock(stock[0]);
      const { symbol: symbol2, latestPrice: latestPrice2 } = await getStock(
        stock[1]
      );

      const firststock = await saveStock(stock[0], like, req.ip);
      const secondstock = await saveStock(stock[1], like, req.ip);

      let stockData = [];
      if (!symbol) {
        stockData.push({
          rel_likes: firststock.likes.length - secondstock.likes.length,
        });
      } else {
        stockData.push({
          stock: symbol,
          price: latestPrice,
          rel_likes: firststock.likes.length - secondstock.likes.length,
        });
      }

      if (!symbol2) {
        stockData.push({
          rel_likes: secondstock.likes.length - firststock.likes.length,
        });
      } else {
        stockData.push({
          stock: symbol2,
          price: latestPrice2,
          rel_likes: secondstock.likes.length - firststock.likes.length,
        });
      }

      res.json({
        stockData,
      });
      return;
    }
    const { symbol, latestPrice } = await getStock(stock);
    if (!symbol) {
      res.json({ stockData: { likes: like ? 1 : 0 } });
      return;
    }

    const oneStockData = await saveStock(symbol, like, req.ip);
    console.log("One Stock Data", oneStockData);

    res.json({
      stockData: {
        stock: symbol,
        price: latestPrice,
        likes: oneStockData.likes.length,
      },
    });
  });
};
