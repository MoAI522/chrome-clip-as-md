chrome.action.onClicked.addListener(async (tab) => {
  try {
    // タブが完全にロードされていることを確認
    if (tab.status === 'complete') {
      await chrome.tabs.sendMessage(tab.id, { action: "startSelection" });
    } else {
      console.log('Page is still loading...');
    }
  } catch (error) {
    console.error('Error sending message:', error);
  }
});