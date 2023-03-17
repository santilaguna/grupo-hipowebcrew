
module.exports = (sequelize, DataTypes) => {
  const sector = sequelize.define('sector', {
    name: DataTypes.STRING,
    latitude: DataTypes.DOUBLE,
    longitude: DataTypes.DOUBLE,
  }, {});
  sector.associate = function (models) {
    sector.belongsToMany(models.food, { through: models.sectorfood });
  };
  return sector;
};
