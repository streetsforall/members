export async function create(auth: string) {
  const { dateRangeStart, dateRangeEnd } = getDateRange();

  // Initiate the CSV generation
  let createResponse;
  try {
    createResponse = await fetch("https://secure.actblue.com/api/v1/csvs", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        csv_type: "paid_contributions",
        date_range_start: dateRangeStart,
        date_range_end: dateRangeEnd,
      }),
    });
  } catch (error: any) {
    if (error instanceof Error) {
      throw new Error(`Error fetching from ActBlue API: ${error.message}`);
    } else {
      throw new Error("Unknown error fetching from ActBlue API");
    }
  }

  const createResponseBody = await createResponse.json();

  return createResponseBody;
}

export async function getUrl(createResponseBody: any, auth: string) {
  let downloadUrl = null;
  while (!downloadUrl) {
    const getResponse = await fetch(
      `https://secure.actblue.com/api/v1/csvs/${createResponseBody.id}`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: "application/json",
        },
      }
    );

    const getResponseBody = await getResponse.json();
    downloadUrl = getResponseBody.download_url;

    if (!downloadUrl) {
      // Wait for a second before the next request
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return downloadUrl;
}

export async function download(downloadUrl: any) {
  const csvResponse = await fetch(downloadUrl);

  if (!csvResponse.ok) {
    throw new Error(`CSV download failed with status ${csvResponse.status}`);
  }

  const csv = await csvResponse.text();

  return csv;
}

function getDateRange() {
  const today = new Date();
  const oneYearAgo = new Date();

  oneYearAgo.setFullYear(today.getFullYear() - 1);

  const dateRangeStart = `${oneYearAgo.getFullYear()}-${String(
    oneYearAgo.getMonth() + 1
  ).padStart(2, "0")}-${String(oneYearAgo.getDate()).padStart(2, "0")}`;
  const dateRangeEnd = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return { dateRangeStart, dateRangeEnd };
}
