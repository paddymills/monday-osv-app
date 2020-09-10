import mondaySdk from "monday-sdk-js";
const monday = mondaySdk();

export default class MondayService {
  static async getGroupItems(boardId, groupId, columns) {
    try {
      const query = `query (
        $boardId: Int!,
        $groupId: String!,
        $columns: [String!]
      ) {
        boards (ids: [$boardId]) {
          name,
          groups (ids: [$groupId]) {
            items {
              id,
              column_values (ids: $columns) {
                id,
                value,
                text
              }
            }
          }
        }
      }`;
      const variables = {
        boardId,
        groupId,
        columns
      };

      const response = await monday.api(query, { variables });

      return response.data.boards[0].groups[0].items;

    } catch (err) {
      handleError(err);
    }
  }

  static async getColumnValues(boardId, itemId, columns) {
    try {
      const query = `query (
        $boardId: Int!,
        $itemId: Int!,
        $columns: [String!]
      ) {
        boards (ids: [$boardId]) {
          items (ids: [$itemId]) {
            column_values (ids: $columns) {
              id,
              value,
              text
            }
          }
        }
      }`;
      const variables = {
        boardId,
        itemId,
        columns
      };

      const response = await monday.api(query, { variables });

      return response.data.boards[0].items[0];

    } catch (err) {
      handleError(err);
    }
  }

  static async changeColumnValue(boardId, itemId, columnId, value) {
    try {
      const query = `mutation (
        $boardId: Int!, $itemId: Int!,
        $columnId: String!,
        $value: JSON!
      ) {
        change_column_value (
          board_id: $boardId,
          item_id: $itemId,
          column_id: $columnId,
          value: $value
        ) {
          id
        }
      }`;
      const variables = {
        boardId,
        columnId,
        itemId,
        value
      };

      const response = await monday.api(query, {
        variables
      });

      return response;

    } catch (err) {
      handleError(err);
    }
  };
}

function handleError(error) {
  monday.execute("notice", {
    message: "Error executing GraphQL. Check console.",
    type: "error",
  });

  console.log(error);
}
