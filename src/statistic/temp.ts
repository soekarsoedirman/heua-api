export const getOutcomeSummary = async (userEmail: string) => {
    const result = await docClient.send(new QueryCommand({
        TableName: TableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk_prefix)",
        ExpressionAttributeValues: {
            ":pk": `USER#${userEmail}`,
            ":sk_prefix": "OUTCOME#"
        }
    }));

    const items = result.Items || [];

    // Menggunakan reduce untuk menjumlahkan atribut 'nominal'
    const totalOutcome = items.reduce((sum, item) => sum + (item.nominal || 0), 0);

    return {
        total: totalOutcome,
        count: items.length,
        data: items
    };
};