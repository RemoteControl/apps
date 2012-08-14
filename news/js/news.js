News={
	DropDownMenu: {
		fade:function(menu){
			$(menu).toggle();
			return false;
		},
		dropdown:function(button){
			var list = $(button).parent().find('ul#dropdownmenu');
			if (list.css('display') == 'none')
				list.slideDown('fast').show();
			else
				list.slideUp('fast');

			return false;
		},
		selectItem:function(item, folderid){
			var parent = $(item).parent().parent();
			parent.find('#dropdownBtn').text($(item).text());
			parent.find(':input[name="folderid"]').val(folderid);
			parent.find('ul#dropdownmenu').slideUp('fast');
		}
	},
	UI: {
		overview:function(dialogtype, dialogfile){
		    if($(dialogtype).dialog('isOpen') == true){
				$(dialogtype).dialog('moveToTop');
			}else{
				$('#dialog_holder').load(OC.filePath('news', 'ajax', dialogfile), function(jsondata){
					if(jsondata.status != 'error'){
						$(dialogtype).dialog({
							dialogClass:'dialog',
							minWidth: 600,
							close: function(event, ui) {
								$(this).dialog('destroy').remove();
							}
						}).css('overflow','visible');
					} else {
						alert(jsondata.data.message);
					}
				});
			}
			return false;
		}
	},
	Folder: {
		submit:function(button){
			var displayname = $("#folder_add_name").val().trim();

			if(displayname.length == 0) {
				OC.dialogs.alert(t('news', 'Name of the folder cannot be empty.'), t('news', 'Error'));
				return false;
			}

			$(button).attr("disabled", true);
			$(button).prop('value', t('news', 'Adding...'));

			var folderid = $('#inputfolderid:input[name="folderid"]').val();

			var url;
			url = OC.filePath('news', 'ajax', 'createfolder.php');

			$.post(url, { name: displayname, parentid: folderid },
				function(jsondata){
					if(jsondata.status == 'success'){
						// if we got a parent folder
						if(folderid > 0){
							$('.collapsable_container[data-id="' + folderid + '"] > ul').append(jsondata.data.listfolder);
						} else {
							$('#feeds').append(jsondata.data.listfolder);
						}
						setupFeedList();
						transformCollapsableTrigger();
						$('#addfolder_dialog').dialog('destroy').remove();
					} else {
						OC.dialogs.alert(jsondata.data.message, t('news', 'Error'));
					}
					$("#folder_add_name").val('');
					$(button).attr("disabled", false);
					$(button).prop('value', t('news','Add folder'));
			});
		},
		'delete':function(folderid) {
			$('.feeds_delete').tipsy('hide');
			OC.dialogs.confirm(t('news', 'Are you sure you want to delete this folder and all its feeds?'), t('news', 'Warning'), function(answer) {
				if(answer == true) {
					var rightcontent = $('div.rightcontent');
					var shownfeedid = rightcontent.attr('data-id');
					$.post(OC.filePath('news', 'ajax', 'deletefolder.php'),{'folderid':folderid, 'shownfeedid':shownfeedid},function(jsondata){
						if(jsondata.status == 'success'){
							$('.collapsable_container[data-id="' + jsondata.data.folderid + '"]').remove();
							if(jsondata.data.part_items) {
								rightcontent.empty();
								rightcontent.html(jsondata.data.part_items);
							}
							transformCollapsableTrigger();
						}
						else{
							OC.dialogs.alert(jsondata.data.message, t('news', 'Error'));
						}
					});
				}
			});
			return false;
		}
	},
	Feed: {
		id:'',
		submit:function(button){

			var feedurl = $("#feed_add_url").val().trim();

			if(feedurl.length == 0) {
				OC.dialogs.alert(t('news', 'URL cannot be empty.'), t('news', 'Error'));
				return false;
			}

			$(button).attr("disabled", true);
			$(button).prop('value', t('news', 'Adding...'));

			var folderid = $('#inputfolderid:input[name="folderid"]').val();

			$.ajax({
				type: "POST",
				url: OC.filePath('news', 'ajax', 'createfeed.php'),
				data: { 'feedurl': feedurl, 'folderid': folderid },
				dataType: "json",
				success: function(jsondata){
					if($('#firstrun').length > 0){
						window.location.reload(); 
					} else {
						if(jsondata.status == 'success'){
							if(folderid > 0){
								$('.collapsable_container[data-id="' + folderid + '"] > ul').append(jsondata.data.listfeed);	
							} else {
								$('#feeds').append(jsondata.data.listfeed);
							}
							setupFeedList();
							News.Feed.load(jsondata.data.feedid);

							OC.dialogs.confirm(t('news', 'Do you want to add another feed?'), t('news', 'Feed added!'), function(answer) {
								if(!answer) {
									$('#addfeed_dialog').dialog('destroy').remove();
									$('ul.accordion').before(jsondata.data.part_newfeed);
								}
							});
						} else {
							OC.dialogs.alert(jsondata.data.message, t('news', 'Error'));
						}
						$("#feed_add_url").val('');
						$(button).attr("disabled", false);
						$(button).prop('value', t('news', 'Add feed'));
					}
				},
				error: function(xhr) {
					OC.dialogs.alert(t('news', 'Error while parsing the feed'), t('news', 'Fatal Error'));
					$("#feed_add_url").val('');
					$(button).attr("disabled", false);
					$(button).prop('value', t('news', 'Add feed'));
				}
			});
		},
		'delete':function(feedid) {
			$('.feeds_delete').tipsy('hide');
			OC.dialogs.confirm(t('news', 'Are you sure you want to delete this feed?'), t('news', 'Warning'), function(answer) {
				if(answer == true) {
					$.post(OC.filePath('news', 'ajax', 'deletefeed.php'),{'feedid':feedid},function(jsondata){
						if(jsondata.status == 'success'){
							$('li.feed[data-id="'+jsondata.data.feedid+'"]').remove();

							var rightcontent = $('div.rightcontent');
							if(rightcontent.attr('data-id') == feedid) {
								rightcontent.find('div#feedadded').remove();
								rightcontent.find('ul.accordion').before(jsondata.data.part_items);
								transformCollapsableTrigger();
								// if the deleted feed is the current feed, reload the page
								window.location.reload();
							}
						}
						else{
							OC.dialogs.alert(jsondata.data.message, t('news', 'Error'));
						}
					});
				}
			});
			return false;
		},
		setAllItemsRead:function(feedId) {
			$.post(OC.filePath('news', 'ajax', 'setallitemsread.php'), { 'feedId' : feedId }, function(jsonData) {
				if(jsonData.status == 'success'){
					// mark ui items as read
					$("#feed_items .feed_item:not(.read)").each(function(){
						$(this).addClass('read');
					});
					var feedHandler = new News.FeedStatusHandler(feedId);
					feedHandler.setUnreadCount(0);
				} else {
					OC.dialogs.alert(t('news', 'Error while loading the feed'), t('news', 'Error'));
				}
			});
		},
		load:function(feedId) {
			$.post(OC.filePath('news', 'ajax', 'loadfeed.php'), { 'feedId' : feedId }, function(jsonData) {
				if(jsonData.status == 'success'){
					var $rightContent = $(".rightcontent");
					$rightContent.attr('data-id', feedId);
					var $feedItems = $('#feed_items');
					$feedItems.empty();
					$feedItems.html(jsonData.data.feedItems);
					var $feedTitle = $(".feed_controls .feed_title h1");
					$feedTitle.html(jsonData.data.feedTitle);

					$('li#selected_feed').attr('id', '');
					$('li.feed[data-id="' + feedId + '"]').attr('id', 'selected_feed');

					transformCollapsableTrigger();
					bindItemEventListeners();
				}
				else {
					OC.dialogs.alert(t('news', 'Error while loading the feed'), t('news', 'Error'));
				}
			});
		},
		updateAll:function() {
			$.post(OC.filePath('news', 'ajax', 'feedlist.php'),function(jsondata){
				if(jsondata.status == 'success'){
					var feeds = jsondata.data;
					for (var i = 0; i < feeds.length; i++) {
						News.Feed.update(feeds[i]['id'], feeds[i]['url'], feeds[i]['folderid']);
					}
				}
				else {
					//TODO:handle error case
				}
			});
		},
		update:function(feedId, feedurl, folderid) {
			var feedHandler = new News.FeedStatusHandler(feedId);
			feedHandler.setUpdating(true);
			data = {
				'feedid':feedId, 
				'feedurl':feedurl, 
				'folderid':folderid
			};
			$.post(OC.filePath('news', 'ajax', 'updatefeed.php'), data, function(jsondata){
				if(jsondata.status == 'success'){
					var newUnreadCount = jsondata.data.unreadcount;
					feedHandler.setUnreadCount(newUnreadCount);
				}
				feedHandler.setUpdating(false);
			});
		}, 
		filter:function(value){
			var data;
			switch(value){
				case 'all':
					data = {
						show: 'all'
					};
					break;
				case 'unread':
					data = {
						show: 'unread'
					};
					break;
				default:
					break;
			}
			$.post(OC.filePath('news', 'ajax', 'usersettings.php'), data, function(jsondata){
				if(jsondata.status == 'success'){
					// TODO
					var currentFeed = $('#rightcontent').data('id');
					News.Feed.load(currentFeed);
				} else {
					//TODO 
				}
			});
		},
		// this array is used to store ids to prevent sending too
		// many posts when scrolling. the structure is: feed_id: boolean
		processing:{},
	},

	/**
	 * This class is responsible for setting and updating items
	 * in the feedlist
	 */
	FeedStatusHandler: function(feedId){
		var _feedId = feedId;
		var _$feed = $('li.feed[data-id="'+feedId+'"]');
		var _$feedUnreadCounter = _$feed.find('.unreaditemcounter');
		var _$feedLink = _$feed.children('a');
		
		/**
		 * Returns the current unread count
		 * @return the number of unread items
		 */
		var _getUnreadCount = function(){
			var unreadContent = _$feedUnreadCounter.html();
			if(unreadContent === ''){
				return 0;
			} else {
				return parseInt(unreadContent);
			}
		};

		/**
		 * Decreases the current unread count by 1
		 */
		var _decrrementUnreadCount = function(){
			_setUnreadCount(_getUnreadCount() - 1);
		};

		/**
		 * Increases the current unread count by 1
		 */
		var _incrementUnreadCount = function(){
			_setUnreadCount(_getUnreadCount() + 1);
		};

		/**
		 * Show an icon and hide the unread count
		 * @param isUpdating if true show the icon and hide count, otherwise
		 * hide the icon and show the unread count
		 */
		var _setUpdating = function(isUpdating){
			if(isUpdating){
				_$feed.addClass('updating');
				_$feedUnreadCounter.hide();
			} else {
				_$feed.removeClass('updating');
				_$feedUnreadCounter.show();
			}
		};

		/**
		 * Set the unread count to a number
		 * @param count the unread count that will be set
		 */
		var _setUnreadCount = function(count){
			// dont allow setting the count below 0
			if(count < 0){
				count = 0;
			} 
			if(count === 0){
				_$feedLink.addClass('all_read');
				_$feedUnreadCounter.addClass('all_read');
			} else {
				var currentCount = _getUnreadCount();
				if(currentCount === 0){
					_$feedLink.removeClass('all_read');
					_$feedUnreadCounter.removeClass('all_read');
				}
			}
			_$feedUnreadCounter.html(count);
		};

		// public
		this.decrrementUnreadCount = function(){ return _decrrementUnreadCount(); };
		this.incrementUnreadCount = function(){ return _incrementUnreadCount(); };
		this.setUpdating = function(isUpdating){ return _setUpdating(isUpdating); };
		this.setUnreadCount = function(count){ return _setUnreadCount(count); };
	},

	/**
	 * This handler handles changes in the ui when the itemstatus changes
	 */
	ItemStatusHandler: function(itemId){
		var _itemId = parseInt(itemId);
		var _$currentItem = $('#feed_items li[data-id="' + itemId + '"]');
		var _feedId = _$currentItem.data('feedid');
		var _read = _$currentItem.hasClass('read');

		/**
		 * Switches important items to unimportant and vice versa
		 */
		var _toggleImportant = function(){
			var _$currentItemStar = _$currentItem.children('.utils').children('.primary_item_utils').children('.star');
			var _important = _$currentItemStar.hasClass('important');
			if(_important){
				status = 'unimportant';
			} else {
				status = 'important';
			}

			var data = {
				itemId: _itemId,
				status: status
			};

			$.post(OC.filePath('news', 'ajax', 'setitemstatus.php'), data, function(jsondata){
				if(jsondata.status == 'success'){
					if(_important){
						_$currentItemStar.removeClass('important');	
					} else {
						_$currentItemStar.addClass('important');
					}
				} else{
					OC.dialogs.alert(jsondata.data.message, t('news', 'Error'));
				}
			});
		};

		/**
		 * Checks the state of the keep read checkbox
		 * @return true if its checked, otherwise false
		 */
		var _isKeptRead = function(){
			var _$currentItemKeepUnread = _$currentItem.children('.utils').children('.secondary_item_utils').children('.keep_unread').children('input[type=checkbox]');
			return _$currentItemKeepUnread.prop('checked');
		}

		/**
		 * Toggles an item as "keep unread". This prevents all handlers to mark it as unread
		 * except the current one
		 */
		var _toggleKeepUnread = function(){
			var _$currentItemKeepUnread = _$currentItem.children('.utils').children('.secondary_item_utils').children('.keep_unread').children('input[type=checkbox]');
			if(_isKeptRead()){
				_$currentItemKeepUnread.prop("checked", false);
			} else {
				_$currentItemKeepUnread.prop("checked", true);
				News.Feed.processing[_itemId] = true;
				_setRead(false);
			}
		};

		/**
		 * Sets the current item as read or unread
		 * @param read true sets the item to read, false to unread
		 */
		var _setRead = function(read){
			var status;

			// if we already have the status, do nothing
			if(read === _read){
				News.Feed.processing[_itemId] = false;
				return;
			}
			// check if the keep unread flag was set
			if(read && _isKeptRead()){
				News.Feed.processing[_itemId] = false;
				return;	
			} 

			if(read){
				status = 'read';
			} else {
				status = 'unread';
			}

			var data = {
				itemId: _itemId,
				status: status
			};

			$.post(OC.filePath('news', 'ajax', 'setitemstatus.php'), data, function(jsonData){
				if(jsonData.status == 'success'){
					var feedHandler = new News.FeedStatusHandler(_feedId);
					if(!_$currentItem.hasClass('read') && read){
						_$currentItem.addClass('read');
						feedHandler.decrrementUnreadCount();
					} else if(_$currentItem.hasClass('read') && !read){
						_$currentItem.removeClass('read');
						feedHandler.incrementUnreadCount();
					}
				} else {
					OC.dialogs.alert(jsonData.data.message, t('news', 'Error'));
				}
				News.Feed.processing[_itemId] = false;
			})
			
		};

		// set public methods
		this.setRead = function(read){ _setRead(read); };
		this.isRead = function(){ return _read; };
		this.toggleImportant = function(){ _toggleImportant(); };
		this.toggleKeepUnread = function(){ _toggleKeepUnread(); };
	},

}

function transformCollapsableTrigger() {
	// we need this here to detect and toggle new children instantly
	$('.collapsable_trigger').unbind();
	$('.collapsable_trigger').click(function(){
		var items = $(this).parent().parent().children('ul');
		items.toggle();
		transformCollapsableTrigger();
	});

	var triggericon = OC.imagePath('core', 'actions/triangle-s.svg');
	var foldericon = OC.imagePath('core', 'places/folder.svg');

	$('.collapsable_trigger').each(
		function() {
			var items = $(this).parent().parent().children('ul');
			if (items.html()) {
				$(this).css('background-image', 'url(' + triggericon + ')');
				if (items.css('display') == 'block') {
					$(this).css('-moz-transform', 'none');
					$(this).css('transform', 'none');
				}
				else {
					$(this).css('-moz-transform', 'rotate(-90deg)');
					$(this).css('transform', 'rotate(-90deg)');
				}
			}
			else {
				$(this).css('background-image', 'url(' + foldericon + ')');
			}
		}
	);
}

function setupFeedList() {
	var list = $('.collapsable,.feed').hover(
		function() {
			$(this).find('.feeds_delete,.feeds_edit').css('display', 'inline');
			$(this).find('.unreaditemcounter').css('display', 'none');
		},
		function() {
			$(this).find('.feeds_delete,.feeds_edit').css('display', 'none');
			$(this).find('.unreaditemcounter').css('display', 'inline');
		}
	);
	list.find('.feeds_delete').hide();
	list.find('.feeds_edit').hide();
	list.find('.unreaditemcounter').show();

	$('.feed').click(function() {
		News.Feed.load($(this).attr('data-id'));
	});

	// select initially loaded feed
	var loadedfeed = $('div.rightcontent').attr('data-id');
	$('li.feed[data-id="' + loadedfeed + '"]').attr('id', 'selected_feed');

	transformCollapsableTrigger();
}


/**
 * Binds a listener on the feed item list to detect scrolling and mark previous
 * items as read
 */
function bindItemEventListeners(){

	// single hover on item should mark it as read too
	$('#feed_items h1.item_title a').click(function(){
		var $item = $(this).parent().parent('.feed_item');
		var itemId = $item.data('id');
		var handler = new News.ItemStatusHandler(itemId);
		handler.setRead(true);
	});

	// mark or unmark as important
	$('#feed_items li.star').click(function(){
		var $item = $(this).parent().parent().parent('.feed_item');
		var itemId = $item.data('id');
        var handler = new News.ItemStatusHandler(itemId);
		handler.toggleImportant();
	});

	// toggle logic for the keep unread handler
	$('#feed_items .keep_unread').click(function(){
		var $item = $(this).parent().parent().parent('.feed_item');
		var itemId = $item.data('id');
        var handler = new News.ItemStatusHandler(itemId);
		handler.toggleKeepUnread();
	});
	$('#feed_items .keep_unread input[type=checkbox]').click(function(){
		var $item = $(this).parent().parent().parent().parent('.feed_item');
		var itemId = $item.data('id');
        var handler = new News.ItemStatusHandler(itemId);
		handler.toggleKeepUnread();
	});

	// bind the mark all as read button
	$('#mark_all_as_read').click(function(){
		var feedId = $('.rightcontent').data('id');
		News.Feed.setAllItemsRead(feedId);
	});

}


$(document).ready(function(){
	$('#addfeed, #addfeedbtn').click(function() {
		News.UI.overview('#addfeed_dialog','feeddialog.php');
	});

	$('#addfolder').click(function() {
		News.UI.overview('#addfolder_dialog','folderdialog.php');
	});

	$('#addfeedfolder').click(function(event) {
	      event.stopPropagation();
	});

	$('#settingsbtn').on('click keydown', function() {
		try {
			OC.appSettings({appid:'news', loadJS:true, cache:false});
		} catch(e) {
			alert(e);
		}
	});

	setupFeedList();

	News.Feed.updateAll();
	var updateInterval = 200000; //how often the feeds should update (in msec)
	setInterval('News.Feed.updateAll()', updateInterval);

	bindItemEventListeners();

	// filter for newest or all items
	$('#feed_filter').change(function(){
		News.Feed.filter($(this).val());
	});

	// mark items whose title was hid under the top edge as read
	// when the bottom is reached, mark all items as read
	$('#feed_items').scroll(function(){
		var boxHeight = $(this).height();
		var scrollHeight = $(this).prop('scrollHeight');
		var scrolled = $(this).scrollTop() + boxHeight;

		$(this).children('ul').children('.feed_item:not(.read)').each(function(){
			var itemOffset = $(this).position().top;
			if(itemOffset <= 0 || scrolled >= scrollHeight){
				var itemId = parseInt($(this).data('id'));
				if(News.Feed.processing[itemId] === undefined || News.Feed.processing[itemId] === false){
					// mark item as processing to prevent unecessary post requests	
					News.Feed.processing[itemId] = true;
					var handler = new News.ItemStatusHandler(itemId);
					handler.setRead(true);	
				}
			}
		})

	});

});

$(document).click(function(event) {
	$('#feedfoldermenu').hide();
});
