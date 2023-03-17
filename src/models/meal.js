
module.exports = (sequelize, DataTypes) => {
  const meal = sequelize.define('meal', {
    name: DataTypes.STRING,
    recipe_description: DataTypes.STRING,
    image: DataTypes.STRING,
  }, {
    getterMethods: {
      async getPrice() {
        try {
          const foodList = await this.getFood();
          let price = 0;
          for (let i = 0; i < foodList.length; i += 1) {
            price += await foodList[i].getPrice;
          }
          return price;
        } catch (err) {
          return err;
        }
      },
    },
  });
  meal.associate = function (models) {
    // associations can be defined here
    meal.belongsToMany(models.food, { through: models.foodmeal });
  };

  return meal;
};
