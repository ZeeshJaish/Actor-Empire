(function () {
  'use strict';

  const data = window.BLUEPRINT_DATA;
  if (!data) throw new Error('Blueprint data did not load.');

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const NODE_WIDTH = 184;
  const NODE_HEIGHT = 78;
  const state = {
    selectedNodeId: null,
    activeJourneyId: null,
    traceMode: 'both',
    perspective: 'all',
    categories: new Set(Object.keys(data.categories)),
    scale: 1,
    x: 0,
    y: 0,
    dragging: false,
    pointerId: null,
    dragStartX: 0,
    dragStartY: 0,
    originX: 0,
    originY: 0
  };

  const byId = new Map(data.nodes.map((node) => [node.id, node]));
  const categoryCounts = data.nodes.reduce((acc, node) => {
    acc[node.category] = (acc[node.category] || 0) + 1;
    return acc;
  }, {});

  const els = {
    svg: document.getElementById('blueprint-map'),
    viewport: document.getElementById('viewport'),
    zonesLayer: document.getElementById('zones-layer'),
    edgesLayer: document.getElementById('edges-layer'),
    nodesLayer: document.getElementById('nodes-layer'),
    canvasWrap: document.getElementById('canvas-wrap'),
    categoryList: document.getElementById('category-list'),
    journeyList: document.getElementById('journey-list'),
    visibleCount: document.getElementById('visible-count'),
    currentView: document.getElementById('current-view'),
    currentViewNote: document.getElementById('current-view-note'),
    zoomLevel: document.getElementById('zoom-level'),
    search: document.getElementById('global-search'),
    searchResults: document.getElementById('search-results'),
    inspector: document.getElementById('inspector'),
    inspectorEmpty: document.getElementById('inspector-empty'),
    inspectorContent: document.getElementById('inspector-content'),
    detailCode: document.getElementById('detail-code'),
    detailCategory: document.getElementById('detail-category'),
    detailTitle: document.getElementById('detail-title'),
    detailSummary: document.getElementById('detail-summary'),
    detailHow: document.getElementById('detail-how'),
    detailInputs: document.getElementById('detail-inputs'),
    detailOutputs: document.getElementById('detail-outputs'),
    detailState: document.getElementById('detail-state'),
    detailConnections: document.getElementById('detail-connections'),
    detailFiles: document.getElementById('detail-files'),
    explorer: document.getElementById('explorer')
  };

  const createSvg = (tag, attrs = {}) => {
    const element = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, String(value)));
    return element;
  };

  const setText = (element, value) => { element.textContent = value; };

  const nodeVisible = (node) => {
    if (!state.categories.has(node.category)) return false;
    return state.perspective === 'all' || node.layer === state.perspective;
  };

  const renderZones = () => {
    els.zonesLayer.textContent = '';
    data.zones.forEach((zone) => {
      const group = createSvg('g');
      group.appendChild(createSvg('rect', { class: 'zone-rect', x: zone.x, y: zone.y, width: zone.width, height: zone.height, rx: 18 }));
      const label = createSvg('text', { class: 'zone-label', x: zone.x + 18, y: zone.y + 28 });
      label.textContent = zone.label;
      group.appendChild(label);
      els.zonesLayer.appendChild(group);
    });
  };

  const edgePath = (source, target) => {
    const sourceCenterX = source.x + NODE_WIDTH / 2;
    const sourceCenterY = source.y + NODE_HEIGHT / 2;
    const targetCenterX = target.x + NODE_WIDTH / 2;
    const targetCenterY = target.y + NODE_HEIGHT / 2;
    const horizontal = Math.abs(targetCenterX - sourceCenterX) >= Math.abs(targetCenterY - sourceCenterY);

    if (horizontal) {
      const direction = targetCenterX >= sourceCenterX ? 1 : -1;
      const startX = sourceCenterX + direction * (NODE_WIDTH / 2 - 3);
      const endX = targetCenterX - direction * (NODE_WIDTH / 2 + 7);
      const bend = Math.max(42, Math.abs(endX - startX) * 0.42);
      return {
        d: `M ${startX} ${sourceCenterY} C ${startX + direction * bend} ${sourceCenterY}, ${endX - direction * bend} ${targetCenterY}, ${endX} ${targetCenterY}`,
        labelX: (startX + endX) / 2,
        labelY: (sourceCenterY + targetCenterY) / 2 - 6
      };
    }

    const direction = targetCenterY >= sourceCenterY ? 1 : -1;
    const startY = sourceCenterY + direction * (NODE_HEIGHT / 2 - 3);
    const endY = targetCenterY - direction * (NODE_HEIGHT / 2 + 7);
    const bend = Math.max(38, Math.abs(endY - startY) * 0.4);
    return {
      d: `M ${sourceCenterX} ${startY} C ${sourceCenterX} ${startY + direction * bend}, ${targetCenterX} ${endY - direction * bend}, ${targetCenterX} ${endY}`,
      labelX: (sourceCenterX + targetCenterX) / 2 + 7,
      labelY: (startY + endY) / 2
    };
  };

  const renderEdges = () => {
    els.edgesLayer.textContent = '';
    data.edges.forEach((item, index) => {
      const source = byId.get(item.from);
      const target = byId.get(item.to);
      if (!source || !target) return;
      const geometry = edgePath(source, target);
      const group = createSvg('g', { 'data-edge-group': String(index) });
      const path = createSvg('path', {
        class: `edge edge-${item.type}`,
        d: geometry.d,
        'data-edge-index': index,
        'data-from': item.from,
        'data-to': item.to
      });
      const label = createSvg('text', { class: 'edge-label', x: geometry.labelX, y: geometry.labelY, 'text-anchor': 'middle' });
      label.textContent = item.label;
      group.appendChild(path);
      group.appendChild(label);
      els.edgesLayer.appendChild(group);
    });
  };

  const renderNodes = () => {
    els.nodesLayer.textContent = '';
    data.nodes.forEach((node) => {
      const category = data.categories[node.category];
      const group = createSvg('g', {
        class: 'node',
        transform: `translate(${node.x} ${node.y})`,
        role: 'button',
        tabindex: '0',
        'aria-label': `${node.title}. ${node.summary}`,
        'data-node-id': node.id,
        style: `--node-color:${category.color}`
      });

      group.appendChild(createSvg('rect', { class: 'node-hit', x: -8, y: -8, width: NODE_WIDTH + 16, height: NODE_HEIGHT + 16, rx: 16 }));
      group.appendChild(createSvg('rect', { class: 'node-orbit', x: -3, y: -3, width: NODE_WIDTH + 6, height: NODE_HEIGHT + 6, rx: 13 }));
      group.appendChild(createSvg('rect', { class: 'node-core', x: 0, y: 0, width: NODE_WIDTH, height: NODE_HEIGHT, rx: 10 }));
      group.appendChild(createSvg('rect', { class: 'node-accent', x: 0, y: 0, width: 4, height: NODE_HEIGHT, rx: 2 }));

      const code = createSvg('text', { class: 'node-code-text', x: 16, y: 20 });
      code.textContent = `${node.code} · ${category.short}`;
      group.appendChild(code);

      const title = createSvg('text', { class: 'node-title', x: 16, y: 43 });
      const words = node.title.split(' ');
      if (node.title.length > 24 && words.length > 2) {
        const split = Math.ceil(words.length / 2);
        const first = createSvg('tspan', { x: 16, dy: 0 });
        first.textContent = words.slice(0, split).join(' ');
        const second = createSvg('tspan', { x: 16, dy: 15 });
        second.textContent = words.slice(split).join(' ');
        title.appendChild(first);
        title.appendChild(second);
      } else {
        title.textContent = node.title;
      }
      group.appendChild(title);

      const meta = createSvg('text', { class: 'node-meta', x: NODE_WIDTH - 14, y: 20, 'text-anchor': 'end' });
      meta.textContent = node.layer === 'player' ? 'UI' : 'LOGIC';
      group.appendChild(meta);

      group.addEventListener('click', (event) => {
        event.stopPropagation();
        selectNode(node.id, { center: false, openInspector: true });
      });
      group.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectNode(node.id, { center: true, openInspector: true });
        }
      });
      els.nodesLayer.appendChild(group);
    });
  };

  const renderCategories = () => {
    els.categoryList.textContent = '';
    Object.entries(data.categories).forEach(([id, category]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'category-toggle';
      button.dataset.category = id;
      button.setAttribute('aria-pressed', String(state.categories.has(id)));
      button.style.setProperty('--category-color', category.color);

      const swatch = document.createElement('span');
      swatch.className = 'category-swatch';
      const label = document.createElement('span');
      label.textContent = category.label;
      const total = document.createElement('span');
      total.className = 'category-total';
      total.textContent = String(categoryCounts[id] || 0);
      button.append(swatch, label, total);

      button.addEventListener('click', () => {
        if (state.categories.has(id) && state.categories.size > 1) state.categories.delete(id);
        else state.categories.add(id);
        button.setAttribute('aria-pressed', String(state.categories.has(id)));
        state.activeJourneyId = null;
        updateView();
      });
      els.categoryList.appendChild(button);
    });
  };

  const renderJourneys = () => {
    els.journeyList.textContent = '';
    data.journeys.forEach((journey) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'journey-button';
      button.dataset.journey = journey.id;
      button.style.setProperty('--journey-color', journey.color);
      button.setAttribute('aria-pressed', 'false');

      const line = document.createElement('span');
      line.className = 'journey-line';
      const content = document.createElement('span');
      const title = document.createElement('strong');
      title.textContent = journey.title;
      const subtitle = document.createElement('small');
      subtitle.textContent = journey.subtitle;
      content.append(title, subtitle);
      const arrow = document.createElementNS(SVG_NS, 'svg');
      arrow.setAttribute('viewBox', '0 0 24 24');
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', 'M9 18l6-6-6-6');
      arrow.appendChild(path);
      button.append(line, content, arrow);

      button.addEventListener('click', () => activateJourney(journey.id));
      els.journeyList.appendChild(button);
    });
  };

  const edgeMatchesJourney = (item, journey) => {
    const pairs = new Set();
    for (let index = 0; index < journey.nodes.length - 1; index += 1) {
      pairs.add(`${journey.nodes[index]}→${journey.nodes[index + 1]}`);
      pairs.add(`${journey.nodes[index + 1]}→${journey.nodes[index]}`);
    }
    return pairs.has(`${item.from}→${item.to}`);
  };

  const getTrace = () => {
    const highlightedNodes = new Set();
    const highlightedEdges = new Set();

    if (state.activeJourneyId) {
      const journey = data.journeys.find((item) => item.id === state.activeJourneyId);
      if (journey) {
        journey.nodes.forEach((id) => highlightedNodes.add(id));
        data.edges.forEach((item, index) => {
          if (edgeMatchesJourney(item, journey)) highlightedEdges.add(index);
        });
      }
      return { highlightedNodes, highlightedEdges };
    }

    if (state.selectedNodeId) {
      highlightedNodes.add(state.selectedNodeId);
      data.edges.forEach((item, index) => {
        const incoming = item.to === state.selectedNodeId;
        const outgoing = item.from === state.selectedNodeId;
        const shouldInclude = state.traceMode === 'both' ? incoming || outgoing : state.traceMode === 'inputs' ? incoming : outgoing;
        if (!shouldInclude) return;
        highlightedEdges.add(index);
        highlightedNodes.add(item.from);
        highlightedNodes.add(item.to);
      });
    }
    return { highlightedNodes, highlightedEdges };
  };

  const updateView = () => {
    const trace = getTrace();
    const hasFocus = trace.highlightedNodes.size > 0;
    let visible = 0;

    document.querySelectorAll('.node').forEach((element) => {
      const node = byId.get(element.dataset.nodeId);
      const isVisible = nodeVisible(node);
      element.classList.toggle('is-hidden', !isVisible);
      element.classList.toggle('is-selected', node.id === state.selectedNodeId);
      element.classList.toggle('is-muted', isVisible && hasFocus && !trace.highlightedNodes.has(node.id));
      if (isVisible) visible += 1;
    });

    document.querySelectorAll('[data-edge-group]').forEach((group) => {
      const index = Number(group.dataset.edgeGroup);
      const item = data.edges[index];
      const sourceVisible = nodeVisible(byId.get(item.from));
      const targetVisible = nodeVisible(byId.get(item.to));
      group.style.display = sourceVisible && targetVisible ? '' : 'none';
      const path = group.querySelector('.edge');
      const isHighlighted = trace.highlightedEdges.has(index);
      path.classList.toggle('is-highlighted', isHighlighted);
      path.classList.toggle('is-muted', hasFocus && !isHighlighted);
      if (isHighlighted) {
        const color = state.activeJourneyId
          ? data.journeys.find((journey) => journey.id === state.activeJourneyId)?.color
          : data.categories[byId.get(state.selectedNodeId)?.category || 'core'].color;
        path.style.setProperty('--edge-highlight', color || '#f5c451');
      }
    });

    document.querySelectorAll('.journey-button').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.journey === state.activeJourneyId));
    });
    document.querySelectorAll('[data-perspective]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.perspective === state.perspective));
    });

    setText(els.visibleCount, `${visible}/${data.nodes.length}`);
    if (state.activeJourneyId) {
      const journey = data.journeys.find((item) => item.id === state.activeJourneyId);
      setText(els.currentView, journey.title);
      setText(els.currentViewNote, journey.subtitle);
    } else if (state.selectedNodeId) {
      const node = byId.get(state.selectedNodeId);
      setText(els.currentView, node.title);
      setText(els.currentViewNote, 'Direct inputs and outputs are highlighted.');
    } else {
      setText(els.currentView, state.perspective === 'all' ? 'Entire game' : state.perspective === 'player' ? 'Player-facing experience' : 'Code & simulation architecture');
      setText(els.currentViewNote, 'Select a node to trace what feeds it and what it affects.');
    }
  };

  const fillList = (element, values) => {
    element.textContent = '';
    values.forEach((value) => {
      const item = document.createElement('li');
      item.textContent = value;
      element.appendChild(item);
    });
  };

  const updateInspector = (node) => {
    if (!node) {
      els.inspectorEmpty.hidden = false;
      els.inspectorContent.hidden = true;
      return;
    }
    const category = data.categories[node.category];
    els.inspector.style.setProperty('--detail-color', category.color);
    setText(els.detailCode, node.code);
    setText(els.detailCategory, `${category.label} · ${node.layer === 'player' ? 'Player surface' : 'Game logic'}`);
    setText(els.detailTitle, node.title);
    setText(els.detailSummary, node.summary);
    fillList(els.detailHow, node.how);
    fillList(els.detailInputs, node.inputs);
    fillList(els.detailOutputs, node.outputs);

    els.detailState.textContent = '';
    node.state.forEach((value) => {
      const code = document.createElement('code');
      code.textContent = value;
      els.detailState.appendChild(code);
    });

    const connected = data.edges
      .filter((item) => item.from === node.id || item.to === node.id)
      .map((item) => ({
        edge: item,
        direction: item.from === node.id ? 'out' : 'in',
        node: byId.get(item.from === node.id ? item.to : item.from)
      }));
    els.detailConnections.textContent = '';
    connected.forEach((connection) => {
      const categoryForConnection = data.categories[connection.node.category];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'connection-button';
      button.style.setProperty('--connection-color', categoryForConnection.color);
      const dot = document.createElement('span');
      dot.className = 'connection-dot';
      const content = document.createElement('span');
      const title = document.createElement('strong');
      title.textContent = connection.node.title;
      const label = document.createElement('small');
      label.textContent = connection.edge.label;
      content.append(title, label);
      const direction = document.createElement('span');
      direction.className = 'connection-direction';
      direction.textContent = connection.direction === 'out' ? '→' : '←';
      button.append(dot, content, direction);
      button.addEventListener('click', () => selectNode(connection.node.id, { center: true, openInspector: true }));
      els.detailConnections.appendChild(button);
    });

    els.detailFiles.textContent = '';
    node.files.forEach((file) => {
      const item = document.createElement('div');
      item.className = 'source-file';
      item.textContent = file;
      els.detailFiles.appendChild(item);
    });
    els.inspectorEmpty.hidden = true;
    els.inspectorContent.hidden = false;
  };

  const centerNode = (node, targetScale = Math.max(state.scale, 0.9)) => {
    const bounds = els.canvasWrap.getBoundingClientRect();
    state.scale = Math.min(1.45, targetScale);
    state.x = bounds.width / 2 - (node.x + NODE_WIDTH / 2) * state.scale;
    state.y = bounds.height / 2 - (node.y + NODE_HEIGHT / 2) * state.scale;
    applyTransform();
  };

  const selectNode = (id, options = {}) => {
    const node = byId.get(id);
    if (!node) return;
    state.selectedNodeId = id;
    state.activeJourneyId = null;
    state.traceMode = 'both';
    state.categories.add(node.category);
    const categoryButton = document.querySelector(`[data-category="${node.category}"]`);
    if (categoryButton) categoryButton.setAttribute('aria-pressed', 'true');
    if (state.perspective !== 'all' && node.layer !== state.perspective) state.perspective = 'all';
    updateInspector(node);
    updateTraceButtons();
    updateView();
    if (options.center) centerNode(node);
    if (options.openInspector && window.innerWidth <= 940) els.inspector.classList.add('is-open');
  };

  const activateJourney = (id) => {
    const journey = data.journeys.find((item) => item.id === id);
    if (!journey) return;
    state.activeJourneyId = state.activeJourneyId === id ? null : id;
    state.selectedNodeId = null;
    state.perspective = 'all';
    journey.nodes.forEach((nodeId) => state.categories.add(byId.get(nodeId).category));
    document.querySelectorAll('.category-toggle').forEach((button) => button.setAttribute('aria-pressed', String(state.categories.has(button.dataset.category))));
    updateInspector(null);
    updateView();
    if (state.activeJourneyId) fitToNodes(journey.nodes.map((nodeId) => byId.get(nodeId)).filter(Boolean));
  };

  const updateTraceButtons = () => {
    ['inputs', 'outputs', 'both'].forEach((mode) => {
      const button = document.getElementById(`trace-${mode}`);
      if (button) button.setAttribute('aria-pressed', String(state.traceMode === mode));
    });
  };

  const applyTransform = () => {
    els.viewport.setAttribute('transform', `translate(${state.x} ${state.y}) scale(${state.scale})`);
    setText(els.zoomLevel, `${Math.round(state.scale * 100)}%`);
  };

  const fitToNodes = (nodes = data.nodes.filter(nodeVisible)) => {
    if (!nodes.length) return;
    const bounds = els.canvasWrap.getBoundingClientRect();
    const minX = Math.min(...nodes.map((node) => node.x)) - 60;
    const minY = Math.min(...nodes.map((node) => node.y)) - 60;
    const maxX = Math.max(...nodes.map((node) => node.x + NODE_WIDTH)) + 60;
    const maxY = Math.max(...nodes.map((node) => node.y + NODE_HEIGHT)) + 60;
    const width = maxX - minX;
    const height = maxY - minY;
    state.scale = Math.max(0.24, Math.min(1.05, (bounds.width - 30) / width, (bounds.height - 30) / height));
    state.x = (bounds.width - width * state.scale) / 2 - minX * state.scale;
    state.y = (bounds.height - height * state.scale) / 2 - minY * state.scale;
    applyTransform();
  };

  const zoomAt = (clientX, clientY, factor) => {
    const bounds = els.canvasWrap.getBoundingClientRect();
    const x = clientX - bounds.left;
    const y = clientY - bounds.top;
    const nextScale = Math.max(0.22, Math.min(2.1, state.scale * factor));
    const worldX = (x - state.x) / state.scale;
    const worldY = (y - state.y) / state.scale;
    state.x = x - worldX * nextScale;
    state.y = y - worldY * nextScale;
    state.scale = nextScale;
    applyTransform();
  };

  const clearFocus = () => {
    state.selectedNodeId = null;
    state.activeJourneyId = null;
    state.traceMode = 'both';
    updateInspector(null);
    updateView();
    fitToNodes();
  };

  const searchNodes = (query) => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return data.nodes
      .map((node) => {
        const category = data.categories[node.category];
        const haystack = [node.title, node.summary, category.label, node.code, ...node.tags, ...node.files, ...node.state].join(' ').toLowerCase();
        let score = 0;
        if (node.title.toLowerCase().startsWith(normalized)) score += 10;
        if (node.title.toLowerCase().includes(normalized)) score += 6;
        if (node.tags.some((tag) => tag.includes(normalized))) score += 4;
        if (haystack.includes(normalized)) score += 1;
        return { node, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.node.title.localeCompare(b.node.title))
      .slice(0, 10)
      .map((item) => item.node);
  };

  const renderSearch = () => {
    const matches = searchNodes(els.search.value);
    els.searchResults.textContent = '';
    if (!els.search.value.trim()) {
      els.searchResults.hidden = true;
      return;
    }
    if (!matches.length) {
      const empty = document.createElement('div');
      empty.className = 'search-result';
      empty.textContent = 'No matching system or source file.';
      els.searchResults.appendChild(empty);
      els.searchResults.hidden = false;
      return;
    }
    matches.forEach((node) => {
      const result = document.createElement('button');
      result.type = 'button';
      result.className = 'search-result';
      result.setAttribute('role', 'option');
      const code = document.createElement('span');
      code.className = 'search-result-code';
      code.textContent = node.code;
      const content = document.createElement('span');
      const title = document.createElement('strong');
      title.textContent = node.title;
      const source = document.createElement('small');
      source.textContent = node.files[0];
      content.append(title, source);
      const category = document.createElement('span');
      category.className = 'search-result-category';
      category.style.background = data.categories[node.category].color;
      result.append(code, content, category);
      result.addEventListener('click', () => {
        selectNode(node.id, { center: true, openInspector: true });
        els.search.value = '';
        els.searchResults.hidden = true;
        els.search.blur();
      });
      els.searchResults.appendChild(result);
    });
    els.searchResults.hidden = false;
  };

  const applyRepoStats = () => {
    const stats = window.BLUEPRINT_REPO_STATS || {};
    const uiCount = Number(stats.views || 0) + Number(stats.components || 0);
    setText(document.getElementById('source-count-top'), stats.sourceFiles || data.nodes.reduce((sum, node) => sum + node.files.length, 0));
    setText(document.getElementById('typescript-count'), stats.sourceFiles || '—');
    setText(document.getElementById('services-count'), stats.services || '—');
    setText(document.getElementById('ui-count'), uiCount || '—');
    setText(document.getElementById('audit-count'), stats.audits || '—');
    setText(document.getElementById('scan-date'), stats.generatedAt ? new Date(stats.generatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'current');
  };

  const bindEvents = () => {
    document.querySelectorAll('[data-perspective]').forEach((button) => {
      button.addEventListener('click', () => {
        state.perspective = button.dataset.perspective;
        state.activeJourneyId = null;
        state.selectedNodeId = null;
        updateInspector(null);
        updateView();
        fitToNodes();
      });
    });

    document.getElementById('clear-focus').addEventListener('click', clearFocus);
    document.getElementById('start-tour').addEventListener('click', () => selectNode('weekly-loop', { center: true, openInspector: true }));
    document.getElementById('close-inspector').addEventListener('click', () => {
      els.inspector.classList.remove('is-open');
      if (window.innerWidth > 940) clearFocus();
    });

    ['inputs', 'outputs', 'both'].forEach((mode) => {
      document.getElementById(`trace-${mode}`).addEventListener('click', () => {
        state.traceMode = mode;
        updateTraceButtons();
        updateView();
      });
    });

    document.getElementById('zoom-in').addEventListener('click', () => {
      const rect = els.canvasWrap.getBoundingClientRect();
      zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 1.2);
    });
    document.getElementById('zoom-out').addEventListener('click', () => {
      const rect = els.canvasWrap.getBoundingClientRect();
      zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 1 / 1.2);
    });
    ['fit-map', 'fit-map-top', 'mobile-fit'].forEach((id) => document.getElementById(id)?.addEventListener('click', () => fitToNodes()));

    els.svg.addEventListener('wheel', (event) => {
      event.preventDefault();
      zoomAt(event.clientX, event.clientY, event.deltaY < 0 ? 1.1 : 1 / 1.1);
    }, { passive: false });

    els.svg.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || event.target.closest('.node')) return;
      state.dragging = true;
      state.pointerId = event.pointerId;
      state.dragStartX = event.clientX;
      state.dragStartY = event.clientY;
      state.originX = state.x;
      state.originY = state.y;
      els.canvasWrap.classList.add('is-dragging');
      els.svg.setPointerCapture(event.pointerId);
    });
    els.svg.addEventListener('pointermove', (event) => {
      if (!state.dragging || event.pointerId !== state.pointerId) return;
      state.x = state.originX + event.clientX - state.dragStartX;
      state.y = state.originY + event.clientY - state.dragStartY;
      applyTransform();
    });
    const stopDrag = (event) => {
      if (!state.dragging || event.pointerId !== state.pointerId) return;
      state.dragging = false;
      state.pointerId = null;
      els.canvasWrap.classList.remove('is-dragging');
      if (els.svg.hasPointerCapture(event.pointerId)) els.svg.releasePointerCapture(event.pointerId);
    };
    els.svg.addEventListener('pointerup', stopDrag);
    els.svg.addEventListener('pointercancel', stopDrag);
    els.svg.addEventListener('click', (event) => {
      if (event.target === els.svg || event.target.classList.contains('map-grid')) clearFocus();
    });

    els.search.addEventListener('input', renderSearch);
    els.search.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        els.search.value = '';
        els.searchResults.hidden = true;
        els.search.blur();
      }
      if (event.key === 'Enter') {
        const first = searchNodes(els.search.value)[0];
        if (first) selectNode(first.id, { center: true, openInspector: true });
        els.searchResults.hidden = true;
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === '/' && document.activeElement !== els.search) {
        event.preventDefault();
        els.search.focus();
      }
      if (event.key === 'Escape' && document.activeElement !== els.search) {
        els.explorer.classList.remove('is-open');
        els.inspector.classList.remove('is-open');
      }
    });
    document.addEventListener('click', (event) => {
      if (!event.target.closest('.topbar-center')) els.searchResults.hidden = true;
    });

    const toggleExplorer = () => {
      const open = els.explorer.classList.toggle('is-open');
      document.getElementById('toggle-explorer')?.setAttribute('aria-expanded', String(open));
    };
    document.getElementById('toggle-explorer')?.addEventListener('click', toggleExplorer);
    document.getElementById('mobile-explore')?.addEventListener('click', toggleExplorer);
    document.getElementById('mobile-details')?.addEventListener('click', () => els.inspector.classList.toggle('is-open'));

    const resizeObserver = new ResizeObserver(() => {
      if (!state.selectedNodeId && !state.activeJourneyId) fitToNodes();
    });
    resizeObserver.observe(els.canvasWrap);
  };

  const initialize = () => {
    renderZones();
    renderEdges();
    renderNodes();
    renderCategories();
    renderJourneys();
    bindEvents();
    applyRepoStats();
    setText(document.getElementById('node-total'), data.nodes.length);
    setText(document.getElementById('edge-total'), data.edges.length);
    setText(document.getElementById('flow-total'), data.journeys.length);
    setText(document.getElementById('journey-count'), data.journeys.length);
    updateView();
    requestAnimationFrame(() => fitToNodes());
  };

  initialize();
})();
