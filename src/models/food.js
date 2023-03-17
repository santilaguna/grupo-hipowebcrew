
module.exports = (sequelize, DataTypes) => {
  const food = sequelize.define('food', {
    name: DataTypes.STRING,
    image: DataTypes.STRING,
    calories: DataTypes.INTEGER,
    fat: DataTypes.INTEGER,
    cholesterol: DataTypes.INTEGER,
    sodium: DataTypes.INTEGER,
    carbohydrate: DataTypes.INTEGER,
    protein: DataTypes.INTEGER,
    category: DataTypes.STRING,
  }, {
    getterMethods: {
      async getPrice() {
        try {
          const ret = 1; // TODO: find price or default value
          return ret;
        } catch (err) {
          return err;
        }
      },
    },
  });

  food.associate = function (models) {
    // associations can be defined here
    food.belongsToMany(models.meal, { through: models.foodmeal });
    food.belongsToMany(models.sector, { through: models.sectorfood });
  };

  return food;
};
