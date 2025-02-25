module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define("Message", {
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    senderUuid: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    recipientUuid: {
      type: DataTypes.UUID, // Puede ser null porque el mensaje va a los admins
      allowNull: true,
    },
    assignedAdminUuid: { // Admin que toma el mensaje
      type: DataTypes.UUID,
      allowNull: true,
    },
    isForAdmins: { // Si es un mensaje abierto para admins
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  });

  return Message;
};
