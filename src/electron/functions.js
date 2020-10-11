const _ = require('lodash')

const lsGet = (key) => JSON.parse(localStorage.getItem(key) || 'null')
const lsSet = (key, value) =>
  localStorage.setItem(key, _.isString(value) ? value : JSON.stringify(value))

const getDecimals = (value) => {
  const absValue = Math.abs(value)
  if (absValue < 0.0005) return 6
  if (absValue < 0.005) return 5
  if (absValue < 0.05) return 4
  if (absValue < 0.5) return 3
  if (absValue < 1) return 2
  if (absValue < 1000) return 2
  if (absValue < 10000) return 1
  return 0
}

const precision = (value, decimals = getDecimals(value)) =>
  Math.floor(value * 10 ** decimals) / 10 ** decimals

const getPLPrice = (basePrice, plPercent, sideSign) =>
  basePrice + sideSign * (plPercent / 100) * basePrice

const getPLPerc = (basePrice, price, sideSign) => ((price / basePrice - 1) / sideSign) * 100

const getFullSize = (amount, count) =>
  _.range(0, count).reduce((acc, i) => acc * (i ? 2 : 1), amount)

const getNextPrice = (
  price,
  i,
  sideSign,
  grid = [
    { PRICE_STEP: 1, X_AMOUNT: 1 },
    { PRICE_STEP: 1, X_AMOUNT: 2 },
  ],
) => price - sideSign * (_.get(grid[i], 'PRICE_STEP') || _.last(grid).PRICE_STEP)

const getNextAmount = (
  amount,
  i,
  grid = [
    { PRICE_STEP: 1, X_AMOUNT: 1 },
    { PRICE_STEP: 1, X_AMOUNT: 2 },
  ],
) => amount * (_.get(grid[i], 'X_AMOUNT') || _.last(grid).X_AMOUNT)

const getOrders = ({
  price,
  amount,
  count,
  sideSign,
  start = 0,
  grid = [
    { PRICE_STEP: 1, X_AMOUNT: 1 },
    { PRICE_STEP: 1, X_AMOUNT: 2 },
  ],
  pricePrecision,
  quantityPrecision,
}) => {
  const res = _.range(0, count).reduce(
    (acc, i) => {
      // const price = acc.price - sideSign * acc.price * 0.0055 * (i * 0.01 + 1)
      let price = getNextPrice(acc.price, i, sideSign, grid)
      // const amount = acc.amount * (i ? 2 : 1)
      const amount = getNextAmount(acc.amount, i, grid)
      let orders = [
        {
          price: precision(acc.price, pricePrecision),
          amount: precision(acc.amount, quantityPrecision),
          priceDiff: precision(acc.price - price),
        },
      ]
      if (i < start) {
        price = acc.price
        orders = []
      }
      return {
        ...acc,
        price,
        amount,
        orders: [...acc.orders, ...orders],
      }
    },
    { price, amount, orders: [] },
  )
  return res.orders
}

// const x = getOrders({
//   price: 11350,
//   amount: 0.005,
//   count: 7,
//   sideSign: -1,
//   grid: [
//     { PRICE_STEP: 20, X_AMOUNT: 1 },
//     { PRICE_STEP: 20, X_AMOUNT: 3 },
//     { PRICE_STEP: 50, X_AMOUNT: 3 },
//     { PRICE_STEP: 60, X_AMOUNT: 1.6 },
//     { PRICE_STEP: 80, X_AMOUNT: 1.6 },
//     { PRICE_STEP: 120, X_AMOUNT: 2 },
//   ],
// })
// console.log(
//   x,
//   x.reduce((acc, o) => {
//     return acc + parseFloat(o.amount)
//   }, 0),
// )

const getPosSize = (
  positionAmount,
  initAmount,
  count,
  grid = [
    { PRICE_STEP: 1, X_AMOUNT: 1 },
    { PRICE_STEP: 1, X_AMOUNT: 2 },
  ],
) => {
  const orders = getOrders({
    price: 1,
    amount: initAmount,
    count,
    sideSign: 1,
    grid,
  })
  const { total, i } = orders.reduce(
    (acc, order, i) => {
      if (positionAmount <= acc.total) {
        return acc
      }
      return { ...acc, total: acc.total + order.amount, i }
    },
    { total: 0, i: 0 },
  )
  return i + Math.min(positionAmount, total) / Math.max(positionAmount, total)
  // return Math.log(Math.abs(parseFloat(positionAmount)) / initAmount) / Math.log(2) + 1
}

// console.log(getPosSize(375, 125, 7, [1, 3, 3, 1.6, 1.6, 2]))

const getOrdersAmount = (orders) =>
  _.reduce(orders, (acc, order) => acc + parseFloat(order.origQty), 0)

const getTpOrdersCount = (amount, minAmount, maxOrders = 8) =>
  Math.min(maxOrders, Math.abs(Math.round(amount / minAmount)))

const getTpOrders = ({
  basePrice,
  amount,
  minAmount,
  maxPrice,
  sideSign,
  maxOrders = 8,
  pricePrecision,
  quantityPrecision,
}) => {
  const count = getTpOrdersCount(amount, minAmount, maxOrders)
  const interval = Math.abs(basePrice - maxPrice) / count
  const ordAmount = precision(
    -sideSign * Math.max(minAmount, Math.abs(amount) / count),
    quantityPrecision,
  )
  const orders = _.range(0, count).map((i) => {
    const price = precision(basePrice + (i + 1) * sideSign * interval, pricePrecision)
    return { price, amount: ordAmount }
  })
  return orders
}

// const a = getTpOrders(370, 1.28, 0.04, 372, 1)
// const b = getTpOrders(372, -0.16, 0.04, 370, -1)
// console.log(a, b)
// console.log(getOrders(370, 0.04, 8, 1))

module.exports = {
  lsGet,
  lsSet,
  getDecimals,
  precision,
  getPLPrice,
  getPLPerc,
  getOrders,
  getFullSize,
  getOrdersAmount,
  getTpOrdersCount,
  getTpOrders,
  getNextPrice,
  getNextAmount,
  getPosSize,
}
