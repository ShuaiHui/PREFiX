$(function() {
	var ce = chrome.extension;
	var bg_win = ce.getBackgroundPage() || window;
	var PREFiX = bg_win.PREFiX;
	var lscache = bg_win.lscache;

	// --- Multi-Account Switching Support ---
	var accountsList = lscache.get('accounts_list') || [];
	if (!Array.isArray(accountsList)) {
		accountsList = [];
	}

	// Backward compatibility: if active account is logged in but list is empty, initialize list with active account
	if (accountsList.length === 0 && PREFiX.account && PREFiX.accessToken) {
		accountsList.push({
			accessToken: PREFiX.accessToken,
			account: PREFiX.account
		});
		lscache.set('accounts_list', accountsList);
	}

	function renderAccounts() {
		var $container = $('#accounts-list-container');
		$container.empty();

		if (accountsList.length === 0) {
			$container.html('<div style="color: #94a3b8; font-size: 13px; padding: 10px 0;">您当前尚未登入任何饭否账号，请点击下方按钮登入。</div>');
			return;
		}

		accountsList.forEach(function(item, idx) {
			var isActive = false;
			if (PREFiX.accessToken && 
				PREFiX.account && 
				String(PREFiX.account.id) === String(item.account.id)) {
				isActive = true;
			}

			var name = item.account.name || item.account.screen_name;
			var avatar = item.account.profile_image_url || '/icons/48.png';

			var $item = $('<div class="account-item"></div>');
			
			var $avatarImg = $('<img />').attr('src', avatar).attr('alt', name);
			$item.append($avatarImg);

			var $info = $('<div class="account-item-info"></div>');
			$info.append($('<div class="account-item-name"></div>').text(name));
			$info.append($('<div class="account-item-instance"></div>').text('@' + item.account.id));
			$item.append($info);

			if (isActive) {
				$item.append($('<span class="account-active-badge">当前活跃</span>'));
			}

			var $actions = $('<div class="account-actions"></div>');
			if (!isActive) {
				var $switchBtn = $('<button class="account-btn account-btn-switch"></button>')
					.text('切换')
					.attr('data-index', idx);
				$actions.append($switchBtn);
			}

			var $logoutBtn = $('<button class="account-btn account-btn-logout"></button>')
				.text('退出')
				.attr('data-index', idx);
			$actions.append($logoutBtn);
			
			$item.append($actions);
			$container.append($item);
		});
	}

	// Switch Account Click Handler
	$(document).on('click', '.account-btn-switch', function() {
		var idx = parseInt($(this).attr('data-index'), 10);
		var targetAcc = accountsList[idx];
		if (targetAcc) {
			lscache.set('access_token', targetAcc.accessToken);
			lscache.set('account_details', targetAcc.account);
			location.reload();
		}
	});

	// Logout Click Handler
	$(document).on('click', '.account-btn-logout', function() {
		var idx = parseInt($(this).attr('data-index'), 10);
		var targetAcc = accountsList[idx];
		if (!targetAcc) return;

		var isActive = false;
		if (PREFiX.accessToken && 
			PREFiX.account && 
			String(PREFiX.account.id) === String(targetAcc.account.id)) {
			isActive = true;
		}

		// Remove from list
		accountsList.splice(idx, 1);
		lscache.set('accounts_list', accountsList);

		if (isActive) {
			if (accountsList.length > 0) {
				// Switch to first remaining account
				lscache.set('access_token', accountsList[0].accessToken);
				lscache.set('account_details', accountsList[0].account);
			} else {
				// No accounts left, clear active session
				lscache.remove('access_token');
				lscache.remove('account_details');
				PREFiX.reset();
			}
		}

		location.reload();
	});

	// Add Account Click Handler
	$(document).on('click', '#add-account', function(e) {
		lscache.remove('access_token');
		lscache.remove('account_details');
		location.reload();
	});

	renderAccounts();
	// ----------------------------------------
	$('#version').text(PREFiX.version);

	var current = PREFiX.settings.current;

	$('[key]').each(function() {
		var $item = $(this);
		var key = $item.attr('key');
		var value = current[key];
		switch ($item.attr('type')) {
			case 'checkbox':
				$item.prop('checked', value);
				break;
			case 'text':
			case 'select':
				$item.val(value);
				break;
			case 'range':
				$item.val(value + '');
				break;
		}
	});

	$('[foldable-src]').on('change', function(e) {
		var type = $(this).attr('foldable-src');
		$('[foldable-tgt="' + type + '"]').prop('hidden', ! this.checked);
	}).trigger('change');

	var $volume = $('#volume');
	$('[key="volume"]').on('change', function(e) {
		var volume = +$(this).val();
		$volume.text(parseInt(volume * 100, 10) + '%');
		PREFiX.settings.current.volume = volume;
	}).trigger('change');

	var $play_sound = $('[key="playSound"]');
	$play_sound.on('change', function(e) {
		var checked = $play_sound.prop('checked');
		$('[key="volume"]').prop('disabled', ! checked);
	}).trigger('change');

	$('#playSound').click(function(e) {
		bg_win.playSound(true);
	});

	var $auto_flush_cache = $('[key="autoFlushCache"]');
	var $cache_amount = $('[key="cacheAmount"]');

	$auto_flush_cache.on('change', function(e) {
		var checked = $auto_flush_cache.prop('checked');
		$cache_amount.prop('disabled', ! checked);
	}).trigger('change');

	$cache_amount.on('change', function(e) {
		$('#cacheAmount').text($cache_amount.val());
	}).trigger('change');



	var last_used_page = lscache.get('last_used_page') || 0;
	var page_loading_timeout;
	$('#navbar li').each(function(i) {
		var $item = $(this);
		$item.click(function(e) {
			$('#navbar li').removeClass('current');
			$('.page').removeClass('current loading');
			$item.addClass('current');
			var page = $item.prop('id') + '-page';
			var $page = $('#' + page);
			$page.addClass('current loading');
			clearTimeout(page_loading_timeout);
			page_loading_timeout = setTimeout(function() {
				$page.removeClass('loading');
			}, 300);
			$('body').scrollTop(0);
			lscache.set('last_used_page', i);
		});
	}).eq(last_used_page).click();

	$('#repostFormat').change(function(e) {
		if (! this.value.trim()) {
			this.value = PREFiX.settings.default.repostFormat;
		}
	});

	var custom_consumer = lscache.get('custom_consumer');
	if (custom_consumer) {
		$('#key').val(custom_consumer.key);
		$('#secret').val(custom_consumer.secret);
	} else {
		custom_consumer = { };
	}
	$('#set-consumer').click(function(e) {
		var key = $('#key').val().trim();
		var secret = $('#secret').val().trim();
		if (! key || ! secret) return;
		if (key === custom_consumer.key ||
			secret === custom_consumer.secret) {
			alert('您已经成功设置了尾巴, 不需要重复设置. :)');
			return;
		}
		bg_win.enableCustomConsumer(key, secret);
	});
	$('#reset-consumer').click(function(e) {
		bg_win.disableCustomConsumer();
		location.reload();
	});

	var $usage_tip_list = $('#usage-tip-page ol').first();
	bg_win.usage_tips.forEach(function(tip) {
		if (! tip) return;
		var $li = $('<li />');
		$li.html(tip);
		$li.appendTo($usage_tip_list);
	});

	$('#status-count').text(bg_win.getStatusCount());
	$('#photo-count').text(bg_win.getPhotoCount());

	var install_time = lscache.get('install_time');
	install_time = bg_win.getYMD(install_time);
	$('#install-time').text(install_time);

	$('#show-updates').click(function(e) {
		var update = [];
		var history = bg_win.history;
		Object.keys(history).forEach(function(version) {
			update.push('# ' + version + ' #');
			update.push.apply(update, history[version]);
			update.push('');
		});
		alert(update.join('\n'));
	});

	$('#filters-overlay').click(function(e) {
		var $page = $(this).find('.page');
		$page.removeClass('pulse');
		setTimeout(function() {
			$page.addClass('pulse');
		});
	});

	$('#filters-area').click(function(e) {
		e.stopPropagation();
	});

	var timeout;
	var filters_model = avalon.define('filters', function(vm) {
		vm.items = [];
		vm.remove = function(e) {
			this.$vmodel.$remove();
		}
		vm.blur = function(e) {
			if (! this.value.trim()) {
				return vm.remove.call(this, e);
			}
		}
	});

	filters_model.items = current.filters;

	$('#show-filters').click(function(e) {
		$('#filters-overlay').
		show().
		css('animation', 'fadeIn .2s');
	});

	function addFilter() {
		var pattern = $pattern.val();
		var type = $type.val();
		if (pattern && pattern.trim().length) {
			filters_model.items.push({
				pattern: pattern,
				type: type
			});
			$pattern.val('');
		}
	}

	var $pattern = $('#filters-list .last .filter-pattern');
	$pattern.
	keyup(function(e) {
		if (e.keyCode === 13) {
			this.blur();
		}
	}).
	blur(function(e) {
		timeout = setTimeout(addFilter, 250);
	});

	$type = $('#filters-list .last .filter-type');
	$type.
	click(function(e) {
		clearTimeout(timeout);
	}).
	change(addFilter);

	$('#filters-overlay-confirm, #filters-overlay .close-button').
	click(function(e) {
		$('#filters-overlay').
		css('animation', 'fadeOut .2s').
		delay(200).
		hide(0);
	});

	function save(e) {
		$('[key]').each(function() {
			var $item = $(this);
			var key = $item.attr('key');
			var value;
			switch ($item.attr('type')) {
				case 'checkbox':
					value = $item.prop('checked');
					break;
				case 'select':
				case 'text':
					value = $item.val();
					break;
				case 'range':
					value = +$item.val();
					break;
			}
			current[key] = value;
		});

		var filters = filters_model.items.map(function(item) {
			return item.$model;
		});

		current.filters = filters;

		PREFiX.settings.save();
	}

	$('[key]').on('change', save);
	$('#filters-overlay .close-button, #filters-overlay-confirm').click(save);
	onunload = function(e) {
		save();
		PREFiX.settings.onSettingsUpdated();
	}
});
