
module.exports = (sequelize, DataTypes) => {
  const foodmeal = sequelize.define('foodmeal', {
    foodId: DataTypes.INTEGER,
    mealId: DataTypes.INTEGER,
  }, {});
  return foodmeal;
};
