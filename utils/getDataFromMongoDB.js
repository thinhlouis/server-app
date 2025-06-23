const getDataFromMongoDB = async (
  collection,
  query = {},
  projection,
  options
) => {
  try {
    // Thêm các tùy chọn nếu có
    const findOptions = {};
    if (projection) findOptions.projection = projection;

    // Tạo cursor với query và options
    const cursor = collection.find(query, findOptions);

    // Áp dụng các tùy chọn bổ sung
    if (options?.sort) cursor.sort(options.sort);
    if (options?.limit) cursor.limit(options.limit);
    if (options?.skip) cursor.skip(options.skip);

    // Chuyển thành array
    const result = await cursor.toArray();

    // Nếu không có dữ liệu, trả về mảng rỗng thay vì null/undefined
    return result || [];
  } catch (error) {
    console.error("Error fetching data from MongoDB:", error);
    throw error; // Ném lỗi để xử lý ở tầng cao hơn
  }
};

module.exports = getDataFromMongoDB;
