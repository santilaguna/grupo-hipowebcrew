
module.exports = (sequelize, DataTypes) => {
  const sectorfood = sequelize.define('sectorfood', {
    sectorId: DataTypes.INTEGER,
    foodId: DataTypes.INTEGER,
    price: DataTypes.INTEGER,
  }, {});

  return sectorfood;
};
